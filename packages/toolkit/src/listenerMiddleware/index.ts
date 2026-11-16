import type { Action, Dispatch, MiddlewareAPI, UnknownAction } from 'redux'
import { isAction } from '../reduxImports'
import type { ThunkDispatch } from 'redux-thunk'
import { createAction } from '../createAction'
import { nanoid } from '../nanoid'

import {
  TaskAbortError,
  listenerCancelled,
  listenerCompleted,
  taskCancelled,
  taskCompleted,
} from './exceptions'
import {
  createDelay,
  createPause,
  raceWithSignal,
  runTask,
  validateActive,
} from './task'
import type {
  AddListenerOverloads,
  AnyListenerPredicate,
  CreateListenerMiddlewareOptions,
  FallbackAddListenerOptions,
  ForkOptions,
  ForkedTask,
  ForkedTaskAPI,
  ForkedTaskExecutor,
  ListenerEntry,
  ListenerErrorHandler,
  ListenerErrorInfo,
  ListenerMiddleware,
  ListenerMiddlewareInstance,
  TakePattern,
  TaskResult,
  TypedAddListener,
  TypedCreateListenerEntry,
  TypedRemoveListener,
  UnsubscribeListener,
  UnsubscribeListenerOptions,
} from './types'
import {
  addAbortSignalListener,
  assertFunction,
  catchRejection,
  noop,
} from './utils'
export { TaskAbortError } from './exceptions'
export type {
  AsyncTaskExecutor,
  CreateListenerMiddlewareOptions,
  ForkedTask,
  ForkedTaskAPI,
  ForkedTaskExecutor,
  ListenerEffect,
  ListenerEffectAPI,
  ListenerErrorHandler,
  ListenerMiddleware,
  ListenerMiddlewareDispatch,
  ListenerMiddlewareInstance,
  SyncTaskExecutor,
  TaskCancelled,
  TaskRejected,
  TaskResolved,
  TaskResult,
  TypedAddListener,
  TypedAddListenerAction,
  TypedRemoveListener,
  TypedRemoveListenerAction,
  TypedStartListening,
  TypedStopListening,
  UnsubscribeListener,
  UnsubscribeListenerOptions,
} from './types'

//Overly-aggressive byte-shaving
const { assign } = Object
/**
 * @internal
 */
const INTERNAL_NIL_TOKEN = {} as const

const alm = 'listenerMiddleware' as const

// Settled promises remove themselves from the set, so loop until it is empty
// to also wait for auto-joined forks started while we were waiting.
const joinAll = async (promises: Set<Promise<unknown>>) => {
  while (promises.size) {
    await Promise.all(promises)
  }
}

const createFork = (
  parentAbortSignal: AbortSignal,
  parentBlockingPromises: Set<Promise<unknown>>,
  api: MiddlewareAPI,
): ForkedTaskAPI['fork'] => {
  return <T>(
    taskExecutor: ForkedTaskExecutor<T>,
    opts?: ForkOptions,
  ): ForkedTask<T> => {
    assertFunction(taskExecutor, 'taskExecutor')
    const childAbortController = new AbortController()
    const { signal } = childAbortController

    const unlinkFromParent = addAbortSignalListener(parentAbortSignal, () =>
      childAbortController.abort(parentAbortSignal.reason),
    )

    const result = runTask<T>(
      async (): Promise<T> => {
        validateActive(parentAbortSignal)
        validateActive(signal)
        const childBlockingPromises = new Set<Promise<unknown>>()
        let result: T
        try {
          result = (await taskExecutor({
            getState: api.getState,
            dispatch: api.dispatch,
            pause: createPause(signal),
            delay: createDelay(signal),
            signal,
            fork: createFork(signal, childBlockingPromises, api),
          })) as T
        } finally {
          await joinAll(childBlockingPromises)
        }
        validateActive(signal)
        return result
      },
      () => {
        unlinkFromParent()
        childAbortController.abort(taskCompleted)
      },
    )

    if (opts?.autoJoin) {
      // Drop each promise once it settles, so long-running tasks that fork
      // repeatedly don't keep every finished result alive.
      const blocking = result.then(() => {
        parentBlockingPromises.delete(blocking)
      })
      parentBlockingPromises.add(blocking)
    }

    return {
      result: createPause<TaskResult<T>>(parentAbortSignal)(result),
      cancel() {
        childAbortController.abort(taskCancelled)
      },
    }
  }
}

const createTakePattern = <S>(
  startListening: AddListenerOverloads<UnsubscribeListener, S, Dispatch>,
  signal: AbortSignal,
): TakePattern<S> => {
  /**
   * A function that takes a ListenerPredicate and an optional timeout,
   * and resolves when either the predicate returns `true` based on an action
   * state combination or when the timeout expires.
   * If the parent listener is canceled while waiting, this will throw a
   * TaskAbortError.
   */
  const take = async <P extends AnyListenerPredicate<S>>(
    predicate: P,
    timeout: number | undefined,
  ) => {
    validateActive(signal)

    // Placeholder unsubscribe function until the listener is added
    let unsubscribe: UnsubscribeListener = noop

    const tuplePromise = new Promise<[Action, S, S]>((resolve, reject) => {
      // Inside the Promise, we synchronously add the listener.
      let stopListening = startListening({
        predicate: predicate as any,
        effect: (action, listenerApi): void => {
          // One-shot listener that cleans up as soon as the predicate passes
          listenerApi.unsubscribe()
          // Resolve the promise with the same arguments the predicate saw
          resolve([
            action,
            listenerApi.getState(),
            listenerApi.getOriginalState(),
          ])
        },
      })
      unsubscribe = () => {
        stopListening()
        reject()
      }
    })

    const promises: (Promise<null> | Promise<[Action, S, S]>)[] = [tuplePromise]
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (timeout != null) {
      promises.push(
        new Promise<null>((resolve) => {
          timeoutId = setTimeout(resolve, timeout, null)
        }),
      )
    }

    try {
      const output = await raceWithSignal(signal, Promise.race(promises))

      validateActive(signal)
      return output
    } finally {
      clearTimeout(timeoutId)
      // Always clean up the listener
      unsubscribe()
    }
  }

  return ((predicate: AnyListenerPredicate<S>, timeout: number | undefined) =>
    catchRejection(take(predicate, timeout))) as TakePattern<S>
}

const getListenerEntryPropsFrom = (options: FallbackAddListenerOptions) => {
  let { type, actionCreator, matcher, predicate, effect } = options

  if (type) {
    predicate = createAction(type).match
  } else if (actionCreator) {
    type = actionCreator!.type
    predicate = actionCreator.match
  } else if (matcher) {
    predicate = matcher
  } else if (!predicate) {
    throw new Error(
      'Creating or removing a listener requires one of the known fields for matching an action',
    )
  }

  assertFunction(effect, 'options.listener')

  return { predicate, type, effect }
}

/** Accepts the possible options for creating a listener, and returns a formatted listener entry */
export const createListenerEntry: TypedCreateListenerEntry<unknown> =
  /* @__PURE__ */ assign(
    (options: FallbackAddListenerOptions) => {
      const { type, predicate, effect } = getListenerEntryPropsFrom(options)

      const entry: ListenerEntry<unknown> = {
        id: nanoid(),
        effect,
        type,
        predicate,
        pending: new Set<AbortController>(),
        unsubscribe: () => {
          throw new Error('Unsubscribe not initialized')
        },
      }

      return entry
    },
    { withTypes: () => createListenerEntry },
  ) as unknown as TypedCreateListenerEntry<unknown>

const findListenerEntry = (
  listenerMap: Map<string, ListenerEntry>,
  options: FallbackAddListenerOptions,
) => {
  const { type, effect, predicate } = getListenerEntryPropsFrom(options)

  return Array.from(listenerMap.values()).find((entry) => {
    const matchPredicateOrType =
      typeof type === 'string'
        ? entry.type === type
        : entry.predicate === predicate

    return matchPredicateOrType && entry.effect === effect
  })
}

const unsubscribeEntry = (
  entry: ListenerEntry,
  options?: UnsubscribeListenerOptions,
) => {
  entry.unsubscribe()
  if (options?.cancelActive) {
    entry.pending.forEach((controller) => {
      controller.abort(listenerCancelled)
    })
  }
}

/**
 * Safely reports errors to the `errorHandler` provided.
 * Errors that occur inside `errorHandler` are notified in a new task.
 * Inspired by [rxjs reportUnhandledError](https://github.com/ReactiveX/rxjs/blob/6fafcf53dc9e557439b25debaeadfd224b245a66/src/internal/util/reportUnhandledError.ts)
 * @param errorHandler
 * @param errorToNotify
 */
const safelyNotifyError = (
  errorHandler: ListenerErrorHandler,
  errorToNotify: unknown,
  errorInfo: ListenerErrorInfo,
): void => {
  try {
    errorHandler(errorToNotify, errorInfo)
  } catch (errorHandlerError) {
    // We cannot let an error raised here block the listener queue.
    // The error raised here will be picked up by `window.onerror`, `process.on('error')` etc...
    setTimeout(() => {
      throw errorHandlerError
    }, 0)
  }
}

/**
 * @public
 */
export const addListener = /* @__PURE__ */ assign(
  /* @__PURE__ */ createAction(`${alm}/add`),
  {
    withTypes: () => addListener,
  },
) as unknown as TypedAddListener<unknown>

/**
 * @public
 */
export const clearAllListeners = /* @__PURE__ */ createAction(
  `${alm}/removeAll`,
)

/**
 * @public
 */
export const removeListener = /* @__PURE__ */ assign(
  /* @__PURE__ */ createAction(`${alm}/remove`),
  {
    withTypes: () => removeListener,
  },
) as unknown as TypedRemoveListener<unknown>

const defaultErrorHandler: ListenerErrorHandler = (...args: unknown[]) => {
  console.error(`${alm}/error`, ...args)
}

/**
 * @public
 */
export const createListenerMiddleware = <
  StateType = unknown,
  DispatchType extends Dispatch<Action> = ThunkDispatch<
    StateType,
    unknown,
    UnknownAction
  >,
  ExtraArgument = unknown,
>(
  middlewareOptions: CreateListenerMiddlewareOptions<ExtraArgument> = {},
) => {
  const listenerMap = new Map<string, ListenerEntry>()

  // Controllers of every effect currently executing, so clearListeners can
  // abort even listeners that have become unsubscribed while executing.
  const executingControllers = new Set<AbortController>()

  const { extra, onError = defaultErrorHandler } = middlewareOptions

  assertFunction(onError, 'onError')

  // Snapshot of `listenerMap`, rebuilt only after it changes. Listeners
  // added or removed by an effect take effect from the next dispatch.
  let snapshot:
    | { entries: ListenerEntry[]; types: Set<string>; anyType: boolean }
    | undefined

  const getSnapshot = () => {
    if (!snapshot) {
      const entries = Array.from(listenerMap.values())
      const types = new Set<string>()
      let anyType = false
      for (const entry of entries) {
        if (typeof entry.type === 'string') {
          types.add(entry.type)
        } else {
          anyType = true
        }
      }
      snapshot = { entries, types, anyType }
    }
    return snapshot
  }

  const addToListenerMap = (entry: ListenerEntry) => {
    if (!listenerMap.has(entry.id)) {
      listenerMap.set(entry.id, entry)
      snapshot = undefined
    }
  }

  const insertEntry = (entry: ListenerEntry) => {
    entry.unsubscribe = () => {
      if (listenerMap.delete(entry.id)) {
        snapshot = undefined
      }
    }

    addToListenerMap(entry)
    return (cancelOptions?: UnsubscribeListenerOptions) =>
      unsubscribeEntry(entry, cancelOptions)
  }

  const startListening = ((options: FallbackAddListenerOptions) => {
    const entry =
      findListenerEntry(listenerMap, options) ??
      createListenerEntry(options as any)

    return insertEntry(entry)
  }) as AddListenerOverloads<any>

  assign(startListening, {
    withTypes: () => startListening,
  })

  const stopListening = (
    options: FallbackAddListenerOptions & UnsubscribeListenerOptions,
  ): boolean => {
    const entry = findListenerEntry(listenerMap, options)

    if (entry) {
      unsubscribeEntry(entry, options)
    }

    return !!entry
  }

  assign(stopListening, {
    withTypes: () => stopListening,
  })

  const notifyListener = async (
    entry: ListenerEntry<unknown, Dispatch<UnknownAction>>,
    action: unknown,
    api: MiddlewareAPI,
    getOriginalState: () => StateType,
  ) => {
    const internalTaskController = new AbortController()
    const { signal } = internalTaskController
    const take = createTakePattern(
      startListening as AddListenerOverloads<any>,
      signal,
    )
    const autoJoinPromises = new Set<Promise<unknown>>()

    try {
      entry.pending.add(internalTaskController)
      executingControllers.add(internalTaskController)
      await entry.effect(
        action,
        // Use assign() rather than ... to avoid extra helper functions added to bundle
        assign({}, api, {
          getOriginalState,
          condition: (predicate: AnyListenerPredicate<any>, timeout?: number) =>
            take(predicate, timeout).then(Boolean),
          take,
          delay: createDelay(signal),
          pause: createPause<any>(signal),
          extra,
          signal,
          fork: createFork(signal, autoJoinPromises, api),
          unsubscribe: entry.unsubscribe,
          subscribe: () => {
            addToListenerMap(entry)
          },
          cancelActiveListeners: () => {
            entry.pending.forEach((controller, _, set) => {
              if (controller !== internalTaskController) {
                controller.abort(listenerCancelled)
                set.delete(controller)
              }
            })
          },
          cancel: () => {
            internalTaskController.abort(listenerCancelled)
            entry.pending.delete(internalTaskController)
          },
          throwIfCancelled: () => {
            validateActive(signal)
          },
        }),
      )
    } catch (listenerError) {
      if (!(listenerError instanceof TaskAbortError)) {
        safelyNotifyError(onError, listenerError, {
          raisedBy: 'effect',
        })
      }
    } finally {
      await joinAll(autoJoinPromises)

      internalTaskController.abort(listenerCompleted) // Notify that the task has completed
      executingControllers.delete(internalTaskController)
      entry.pending.delete(internalTaskController)
    }
  }

  const clearListenerMiddleware = () => {
    executingControllers.forEach((controller) => {
      controller.abort(listenerCancelled)
    })
    listenerMap.clear()
    snapshot = undefined
  }

  const middleware: ListenerMiddleware<
    StateType,
    DispatchType,
    ExtraArgument
  > = (api) => (next) => (action) => {
    if (!isAction(action)) {
      // we only want to notify listeners for action objects
      return next(action)
    }

    if (addListener.match(action)) {
      return startListening(action.payload as any)
    }

    if (clearAllListeners.match(action)) {
      clearListenerMiddleware()
      return
    }

    if (removeListener.match(action)) {
      return stopListening(
        action.payload as FallbackAddListenerOptions &
          UnsubscribeListenerOptions,
      )
    }

    // Need to get this state _before_ the reducer processes the action
    let originalState: StateType | typeof INTERNAL_NIL_TOKEN = api.getState()

    // `getOriginalState` can only be called synchronously.
    // @see https://github.com/reduxjs/redux-toolkit/discussions/1648#discussioncomment-1932820
    const getOriginalState = (): StateType => {
      if (originalState === INTERNAL_NIL_TOKEN) {
        throw new Error(
          `${alm}: getOriginalState can only be called synchronously`,
        )
      }

      return originalState as StateType
    }

    let result: unknown

    try {
      // Actually forward the action to the reducer before we handle listeners
      result = next(action)

      const { entries, types, anyType } = getSnapshot()

      // Entries registered by `type` or `actionCreator` can only match their
      // own type; `matcher` and `predicate` entries can match any action.
      if (anyType || types.has(action.type)) {
        const currentState = api.getState()

        for (const entry of entries) {
          if (typeof entry.type === 'string' && entry.type !== action.type) {
            continue
          }

          let runListener = false

          try {
            runListener = entry.predicate(action, currentState, originalState)
          } catch (predicateError) {
            safelyNotifyError(onError, predicateError, {
              raisedBy: 'predicate',
            })
          }

          if (!runListener) {
            continue
          }

          notifyListener(entry, action, api, getOriginalState)
        }
      }
    } finally {
      // Remove `originalState` store from this scope.
      originalState = INTERNAL_NIL_TOKEN
    }

    return result
  }

  return {
    middleware,
    startListening,
    stopListening,
    clearListeners: clearListenerMiddleware,
  } as ListenerMiddlewareInstance<StateType, DispatchType, ExtraArgument>
}
