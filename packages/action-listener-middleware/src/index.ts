/* eslint-disable @typescript-eslint/consistent-type-imports */
/**
 * CURRENT BRANCH GOALS:
 * 
 * The `middleware.addListener` and `dispatch(addListenerAction())` methods are disconnected from the store, so they can't know the real app State/Dispatch types.

I want to enable a "pre-typed" setup like we have for React-Redux hooks.

Right now there's 4 overloads / options you can pass in to tell the middleware what action to listen to:

- plain string (for action type)
- RTK action creator
- RTK "matcher" function
- A "listener predicate" (action, currState, prevState) => boolean

Currently, the overloads are buried inside the middleware and dependent on its `State` generic.

I want to:

- Extract the overloads
- Have a common function for creating a "listener entry" from the args
- Use the overloads for `middleware.addListener` + `addListenerAction`

I would like the `State` to default to `unknown`. But, I then want to allow:

export const addAppListener : TypedAddListenerFunction<RootState> = middleware.addListener

so that all further usages elsewhere have the right state type

On top of that, the code needs to correctly infer the right type for `action` in the listener, but the way it does that has to vary based on the option provided for matching.

The original `addListener` gets action inference okay, but I can't extract things how I want to.
 */

import {
  createAction,
  createSlice,
  nanoid,
  PayloadAction,
  Middleware,
  Dispatch,
  AnyAction,
  MiddlewareAPI,
  Action,
  ThunkDispatch,
  ActionCreatorWithPreparedPayload,
} from '@reduxjs/toolkit'
import { AddListenerGlobals } from './globals'

interface BaseActionCreator<P, T extends string, M = never, E = never> {
  type: T
  match(action: Action<unknown>): action is PayloadAction<P, T, M, E>
}

interface TypedActionCreator<Type extends string> {
  (...args: any[]): Action<Type>
  type: Type
  match: MatchFunction<any>
}

type ListenerPredicate<Action extends AnyAction, State> = (
  action: Action,
  currentState?: State,
  originalState?: State
) => action is Action

// type ConditionFunction<Action extends AnyAction, State> = (
//   predicate: ListenerPredicate<Action, State> | (() => boolean),
//   timeout?: number
// ) => Promise<boolean>

interface ConditionFunction<Action extends AnyAction, State> {
  (
    predicate: ListenerPredicate<Action, State>,
    timeout?: number
  ): Promise<boolean>
  (predicate: () => boolean, timeout?: number): Promise<boolean>
}

type MatchFunction<T> = (v: any) => v is T

export interface HasMatchFunction<T> {
  match: MatchFunction<T>
}

function assertFunction(
  func: unknown,
  expected: string
): asserts func is (...args: unknown[]) => unknown {
  if (typeof func !== 'function') {
    throw new TypeError(`${expected} in not a function`)
  }
}

export const hasMatchFunction = <T>(
  v: Matcher<T>
): v is HasMatchFunction<T> => {
  return v && typeof (v as HasMatchFunction<T>).match === 'function'
}

export const isActionCreator = (
  item: Function
): item is TypedActionCreator<any> => {
  return (
    typeof item === 'function' &&
    typeof (item as any).type === 'string' &&
    hasMatchFunction(item as any)
  )
}

/** @public */
export type Matcher<T> = HasMatchFunction<T> | MatchFunction<T>

type Unsubscribe = () => void

type GuardedType<T> = T extends (x: any) => x is infer T ? T : never

const declaredMiddlewareType: unique symbol = undefined as any
export type WithMiddlewareType<T extends Middleware<any, any, any>> = {
  [declaredMiddlewareType]: T
}

export type MiddlewarePhase = 'beforeReducer' | 'afterReducer'

const defaultWhen: MiddlewarePhase = 'afterReducer'
const actualMiddlewarePhases = ['beforeReducer', 'afterReducer'] as const

export type When = MiddlewarePhase | 'both' | undefined
// type WhenFromOptions<O extends ActionListenerBaseOptions> =
//   O extends ActionListenerBaseOptions ? O['when'] : never

/**
 * @alpha
 */
export interface ActionListenerMiddlewareAPI<S, D extends Dispatch<AnyAction>>
  extends MiddlewareAPI<D, S> {
  getOriginalState: () => S
  unsubscribe(): void
  condition: ConditionFunction<AnyAction, S>
  currentPhase: MiddlewarePhase
  // TODO Figure out how to pass this through the other types correctly
  extra: unknown
}

/**
 * @alpha
 */
export type ActionListener<
  A extends AnyAction,
  S = unknown,
  D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>
> = (action: A, api: ActionListenerMiddlewareAPI<S, D>) => void

export interface ListenerErrorHandler {
  (error: unknown): void
}

export interface ActionListenerBaseConfig {
  /**
   * Determines if the listener runs 'before' or 'after' the reducers have been called.
   * If set to 'before', calling `api.stopPropagation()` from the listener becomes possible.
   * Defaults to 'before'.
   */
  when?: When
}

export interface ActionListenerBaseOptions<
  Action extends AnyAction,
  S = unknown,
  D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>
> extends ActionListenerBaseConfig {
  listener: ActionListener<Action, S, D>
}

interface ActionListenerTypeStringOptions<T extends string> {
  type: T
}

interface ActionListenerActionCreatorOptions<
  AC extends TypedActionCreator<string>
> {
  action: AC
}

interface ActionListenerMatcherOptions<
  MA extends AnyAction,
  M extends MatchFunction<MA>
> {
  matcher: M
}

interface ActionListenerPredicateOptions<
  MA extends AnyAction,
  State = unknown,
  LP extends ListenerPredicate<MA, State> = ListenerPredicate<MA, State>
> {
  predicate: LP
}

type CombinedOptions =
  | ActionListenerTypeStringOptions<any>
  | ActionListenerActionCreatorOptions<any>
  | ActionListenerMatcherOptions<any, any>
  | ActionListenerPredicateOptions<any, any>

type InferStringAction<O extends ActionListenerTypeStringOptions<any>> =
  O extends ActionListenerTypeStringOptions<any> ? Action<O['type']> : never

type TypeWithGeneric<T> = T[]
type extractGeneric<Type> = Type extends TypeWithGeneric<infer X> ? X : never

type InferOptions<O extends CombinedOptions> = O extends infer AO ? AO : never

type ActionListenerOptions<
  S = unknown,
  D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>,
  Options extends CombinedOptions = CombinedOptions
  // ActualOptions = Options extends infer AO ? AO : never
> = Options &
  ActionListenerBaseOptions<
    Options extends ActionListenerTypeStringOptions<any>
      ? Action<Options['type']>
      : Options extends ActionListenerActionCreatorOptions<any>
      ? ReturnType<Options['action']>
      : // : ActualOptions extends ActionListenerMatcherOptions<any, any>
        // ? GuardedType<ActualOptions['matcher']>
        AnyAction,
    S,
    D
  >

export interface CreateListenerMiddlewareOptions<ExtraArgument = unknown> {
  extra?: ExtraArgument
  /**
   * Receives synchronous errors that are raised by `listener` and `listenerOption.predicate`.
   */
  onError?: ListenerErrorHandler
}

type ListenerEntry<
  S = any,
  D extends Dispatch<AnyAction> = Dispatch<AnyAction>
> = {
  id: string
  when: When
  listener: ActionListener<any, S, D>
  unsubscribe: () => void
  type?: string
  predicate: ListenerPredicate<any, any>
  options?: ActionListenerOptions<S, D>
}

const createListenerEntry = <
  S = unknown,
  D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>
>(
  options: ActionListenerOptions<S, D>
) => {
  let predicate: ListenerPredicate<any, any>
  let type: string | undefined

  if ('type' in options) {
    type = options.type
    predicate = (action: any): action is any => action.type === type
  } else if ('action' in options) {
    type = options.action.type
    predicate = options.action.match
  } else if ('matcher' in options) {
    predicate = options.matcher
  } else {
    predicate = options.predicate
  }

  const id = nanoid()
  const entry: ListenerEntry<S, D> = {
    when: options.when || defaultWhen,
    id,
    listener: options.listener,
    type,
    predicate,
    options,
    unsubscribe: () => {
      throw new Error('Unsubscribe not initialized')
    },
  }

  return entry
}

interface CounterState {
  value: number
}

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    increment(state) {
      state.value += 1
    },
    // Use the PayloadAction type to declare the contents of `action.payload`
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload
    },
  },
})
const { increment, incrementByAmount } = counterSlice.actions

const entry = createListenerEntry<CounterState>({
  action: incrementByAmount,
  listener: (action, listenerApi) => {
    listenerApi.getState()
  },
})

export interface AddListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>,
  O extends ActionListenerOptions
> {
  type: 'actionListenerMiddleware/add'
  payload: ListenerEntry<S, D>
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
  errorToNotify: unknown
): void => {
  try {
    errorHandler(errorToNotify)
  } catch (errorHandlerError) {
    // We cannot let an error raised here block the listener queue.
    // The error raised here will be picked up by `window.onerror`, `process.on('error')` etc...
    setTimeout(() => {
      throw errorHandlerError
    }, 0)
  }
}

type OverloadedArguments<T> = T extends {
  (...args: infer A1): any
  (...args: infer A2): any
  (...args: infer A3): any
  (...args: infer A4): any
}
  ? A1 | A2 | A3 | A4
  : T extends {
      (...args: infer A1): any
      (...args: infer A2): any
      (...args: infer A3): any
    }
  ? A1 | A2 | A3
  : T extends { (...args: infer A1): any; (...args: infer A2): any }
  ? A1 | A2
  : T extends (...args: infer A) => any
  ? A
  : any

export type TypedAddListenerAction<
  S,
  D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>,
  Options = ActionListenerOptions<S, D>,
  Payload = ListenerEntry<S, D>,
  T extends string = 'actionListenerMiddleware/add'
> = BaseActionCreator<Payload, T> &
  AddListenerOverloads<
    ReturnType<ActionCreatorWithPreparedPayload<[Options], Payload>>
  >
//&
// ((
//   options: Options
// ) => ReturnType<ActionCreatorWithPreparedPayload<[Options], Payload>>)

/**
 * @alpha
 */
export const addListenerAction = createAction(
  'actionListenerMiddleware/add',
  function prepare(options: ActionListenerOptions) {
    const entry = createListenerEntry(options)

    return {
      payload: entry,
    }
  }
) as TypedAddListenerAction<unknown>
// as unknown as BaseActionCreator<
//   ListenerEntry<unknown, Dispatch<AnyAction>>,
//   'actionListenerMiddleware/add'
// > & ListenerEntryCreator<unknown, ActionListenerOptions>

// const res = addListenerAction({
//   type: 'abcd',

//   listener: (action, listenerApi) => {
//     const state = listenerApi.getState()
//     const state2 = listenerApi.getState() as CounterState
//   },
//   when: 'beforeReducer',
// })

interface CounterState {
  value: number
}
const ala2 = addListenerAction as TypedAddListenerAction<CounterState>

// ala2(
//   'abcd',
//   (action, listenerApi) => {
//     const state = listenerApi.getState()

//     listenerApi.dispatch((dispatch, getState) => {
//       const state2 = getState()
//     })
//   },
//   { when: 'beforeReducer' }
// )
/* {
  <
    C extends TypedActionCreator<any>,
    S,
    D extends Dispatch,
    O extends ActionListenerOptions
  >(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D, O>,
    options?: O
  ): AddListenerAction<ReturnType<C>, S, D, O>

  <S, D extends Dispatch, O extends ActionListenerOptions>(
    type: string,
    listener: ActionListener<AnyAction, S, D, O>,
    options?: O
  ): AddListenerAction<AnyAction, S, D, O>
}
*/

interface RemoveListenerAction<
  A extends AnyAction,
  S,
  D extends Dispatch<AnyAction>
> {
  type: 'actionListenerMiddleware/remove'
  payload: {
    type: string
    listener: ActionListener<A, S, D>
  }
}

/**
 * @alpha
 */
export const removeListenerAction = createAction(
  'actionListenerMiddleware/remove',
  function prepare(
    typeOrActionCreator: string | TypedActionCreator<string>,
    listener: ActionListener<any, any, any>
  ) {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : (typeOrActionCreator as TypedActionCreator<string>).type

    return {
      payload: {
        type,
        listener,
      },
    }
  }
) as BaseActionCreator<
  { type: string; listener: ActionListener<any, any, any> },
  'actionListenerMiddleware/remove'
> & {
  <C extends TypedActionCreator<any>, S, D extends Dispatch>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>
  ): RemoveListenerAction<ReturnType<C>, S, D>

  <S, D extends Dispatch>(
    type: string,
    listener: ActionListener<AnyAction, S, D>
  ): RemoveListenerAction<AnyAction, S, D>
}

const defaultErrorHandler: ListenerErrorHandler = (...args: unknown[]) => {
  console.error('action-listener-middleware-error', ...args)
}

// type SampleState = {

//   foo: {
//     bar: {
//       baz: string
//       quuz: number
//     }
//   }
// }
// declare module './globals' {
//   interface AddListenerGlobals {
//     state: SampleState
//     dispatch: Dispatch<AnyAction>
//   }
// }

type GlobalState = AddListenerGlobals extends { state : infer State} ? State : unknown
type GlobalDispatch = AddListenerGlobals extends { dispatch: infer D} ? D extends Dispatch ? D : Dispatch<AnyAction> : Dispatch<AnyAction>

type StateType<S = unknown> = S extends unknown ? GlobalState : S

interface AddListenerOverloads<
  Return,
  S = GlobalState,
  D extends Dispatch = GlobalDispatch
> {
  <C extends TypedActionCreator<any>, O extends ActionListenerBaseConfig>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>,
    options?: O
  ): Return
  // eslint-disable-next-line no-redeclare
  <T extends string, O extends ActionListenerBaseConfig>(
    type: T | undefined,
    listener: ActionListener<Action<T>, S, D>,
    options?: O
  ): Return
  // eslint-disable-next-line no-redeclare
  <
    MA extends AnyAction,
    M extends MatchFunction<MA>,
    O extends ActionListenerBaseConfig
  >(
    matcher: M,
    listener: ActionListener<GuardedType<M>, S, D>,
    options?: O
  ): Return
  // eslint-disable-next-line no-redeclare
  <
    MA extends AnyAction,
    M extends ListenerPredicate<MA, S>,
    O extends ActionListenerBaseConfig
  >(
    matcher: M,
    listener: ActionListener<AnyAction, S, D>,
    options?: O
  ): Return
}
/**
 * @alpha
 */
export function createActionListenerMiddleware<
  S = any,
  // TODO Carry through the thunk extra arg somehow?
  D extends Dispatch<AnyAction> = ThunkDispatch<S, unknown, AnyAction>,
  ExtraArgument = unknown
>(middlewareOptions: CreateListenerMiddlewareOptions<ExtraArgument> = {}) {
  const listenerMap = new Map<string, ListenerEntry<S, D>>()
  const { extra, onError = defaultErrorHandler } = middlewareOptions

  assertFunction(onError, 'onError')

  // eslint-disable-next-line no-redeclare
  const addListener: AddListenerOverloads<Unsubscribe,S,D> = function addListener(
    typeOrActionCreator:
      | string
      | TypedActionCreator<any>
      | ListenerPredicate<any, any>,
    listener: ActionListener<AnyAction, S, D>,
    options?: ActionListenerBaseConfig
  ): Unsubscribe {
    let predicate: ListenerPredicate<any, any>
    let type: string | undefined

    let entry = findListenerEntry(
      (existingEntry) => existingEntry.listener === listener
    )

    if (!entry) {
      if (typeof typeOrActionCreator === 'string') {
        type = typeOrActionCreator
        predicate = (action: any): action is Action => action.type === type
      } else {
        if (isActionCreator(typeOrActionCreator)) {
          type = typeOrActionCreator.type
          predicate = typeOrActionCreator.match
        } else {
          predicate = typeOrActionCreator as unknown as ListenerPredicate<
            any,
            any
          >
        }
      }

      const id = nanoid()
      const unsubscribe = () => listenerMap.delete(id)
      entry = {
        when: defaultWhen,
        ...options,
        id,
        listener,
        type,
        predicate,
        unsubscribe,
      }

      listenerMap.set(id, entry)
    }

    return entry.unsubscribe
  }
  const middleware: Middleware<
    {
      (action: Action<'actionListenerMiddleware/add'>): Unsubscribe
    },
    S,
    D
  > = (api) => (next) => (action) => {
    if (addListenerAction.match(action)) {
      const unsubscribe = addListener(
        action.payload.type,
        action.payload.listener,
        action.payload.options
      )

      return unsubscribe
    }
    if (removeListenerAction.match(action)) {
      // @ts-ignore
      removeListener(action.payload.type, action.payload.listener)

      return
    }

    if (listenerMap.size === 0) {
      return next(action)
    }

    let result: unknown
    const originalState = api.getState()
    const getOriginalState = () => originalState

    for (const currentPhase of actualMiddlewarePhases) {
      let currentState = api.getState()
      for (let entry of listenerMap.values()) {
        const runThisPhase =
          entry.when === 'both' || entry.when === currentPhase

        let runListener = runThisPhase

        if (runListener) {
          try {
            runListener = entry.predicate(action, currentState, originalState)
          } catch (predicateError) {
            safelyNotifyError(onError, predicateError)
            runListener = false
          }
        }

        if (!runListener) {
          continue
        }

        try {
          entry.listener(action, {
            ...api,
            getOriginalState,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            condition,
            currentPhase,
            extra,
            unsubscribe: entry.unsubscribe,
          })
        } catch (listenerError) {
          safelyNotifyError(onError, listenerError)
        }
      }
      if (currentPhase === 'beforeReducer') {
        result = next(action)
      } else {
        return result
      }
    }
  }


  function removeListener<C extends TypedActionCreator<any>>(
    actionCreator: C,
    listener: ActionListener<ReturnType<C>, S, D>
  ): boolean
  // eslint-disable-next-line no-redeclare
  function removeListener(
    type: string,
    listener: ActionListener<AnyAction, S, D>
  ): boolean
  // eslint-disable-next-line no-redeclare
  function removeListener(
    typeOrActionCreator: string | TypedActionCreator<any>,
    listener: ActionListener<AnyAction, S, D>
  ): boolean {
    const type =
      typeof typeOrActionCreator === 'string'
        ? typeOrActionCreator
        : typeOrActionCreator.type

    let entry = findListenerEntry(
      (entry) => entry.type === type && entry.listener === listener
    )

    if (!entry) {
      return false
    }

    listenerMap.delete(entry.id)
    return true
  }

  function findListenerEntry(
    comparator: (entry: ListenerEntry<S, D>) => boolean
  ): ListenerEntry<S, D> | undefined {
    for (const entry of listenerMap.values()) {
      if (comparator(entry)) {
        return entry
      }
    }

    return undefined
  }

  const condition: ConditionFunction<AnyAction, S> = async (
    predicate,
    timeout
  ) => {
    let unsubscribe: Unsubscribe = () => {}

    const conditionSucceededPromise = new Promise<boolean>(
      (resolve, reject) => {
        unsubscribe = addListener(
          predicate as any,
          (action, listenerApi) => {
            // One-shot listener that cleans up as soon as the predicate resolves
            listenerApi.unsubscribe()
            resolve(true)
          },
          { when: 'both' }
        )
      }
    )

    if (timeout === undefined) {
      return conditionSucceededPromise
    }

    const timedOutPromise = new Promise<boolean>((resolve, reject) => {
      setTimeout(() => {
        resolve(false)
      }, timeout)
    })

    const result = await Promise.race([
      conditionSucceededPromise,
      timedOutPromise,
    ])

    unsubscribe()
    return result
  }

  return Object.assign(
    middleware,
    { addListener, removeListener },
    {} as WithMiddlewareType<typeof middleware>
  )
}
