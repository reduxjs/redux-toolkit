import { Dispatch } from 'redux'
import nanoid from 'nanoid'
import { createAction } from './createAction'

export type BaseThunkAPI<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: () => S
  extra: E
  requestId: string
  signal: AbortSignal
}

/**
 * @alpha
 */
export interface SerializedError {
  name?: string
  message?: string
  stack?: string
  code?: string
}

const commonProperties: (keyof SerializedError)[] = [
  'name',
  'message',
  'stack',
  'code'
]

// Reworked from https://github.com/sindresorhus/serialize-error
export const miniSerializeError = (value: any): any => {
  if (typeof value === 'object' && value !== null) {
    const simpleError: SerializedError = {}
    for (const property of commonProperties) {
      if (typeof value[property] === 'string') {
        simpleError[property] = value[property]
      }
    }

    return simpleError
  }

  return value
}

/**
 *
 * @param type
 * @param payloadCreator
 *
 * @alpha
 */
export function createAsyncThunk<
  ActionType extends string,
  Returned,
  ThunkArg = void,
  ThunkAPI extends BaseThunkAPI<any, any, any> = BaseThunkAPI<
    unknown,
    unknown,
    Dispatch
  >
>(
  type: ActionType,
  payloadCreator: (
    arg: ThunkArg,
    thunkAPI: ThunkAPI
  ) => Promise<Returned> | Returned
) {
  const fulfilled = createAction(
    type + '/fulfilled',
    (result: Returned, requestId: string, arg: ThunkArg) => {
      return {
        payload: result,
        meta: { arg, requestId }
      }
    }
  )

  const pending = createAction(
    type + '/pending',
    (requestId: string, arg: ThunkArg) => {
      return {
        payload: undefined,
        meta: { arg, requestId }
      }
    }
  )

  const rejected = createAction(
    type + '/rejected',
    (error: Error, requestId: string, arg: ThunkArg) => {
      const aborted = error && error.name === 'AbortError'
      return {
        payload: undefined,
        error: miniSerializeError(error),
        meta: {
          arg,
          requestId,
          aborted,
          abortReason: aborted ? error.message : undefined
        }
      }
    }
  )

  function actionCreator(arg: ThunkArg) {
    return (
      dispatch: ThunkAPI['dispatch'],
      getState: ThunkAPI['getState'],
      extra: ThunkAPI['extra']
    ) => {
      const requestId = nanoid()
      const abortController = new AbortController()
      let abortAction: ReturnType<typeof rejected> | undefined

      function abort(reason: string = 'Aborted.') {
        abortController.abort()
        abortAction = rejected(
          { name: 'AbortError', message: reason },
          requestId,
          arg
        )
        dispatch(abortAction)
      }

      const promise = (async function() {
        let finalAction: ReturnType<typeof fulfilled | typeof rejected>
        try {
          dispatch(pending(requestId, arg))

          finalAction = fulfilled(
            await payloadCreator(arg, {
              dispatch,
              getState,
              extra,
              requestId,
              signal: abortController.signal
            } as ThunkAPI),
            requestId,
            arg
          )
        } catch (err) {
          if (err && err.name === 'AbortError' && abortAction) {
            // abortAction has already been dispatched, no further action should be dispatched
            // by this thunk.
            // return a copy of the dispatched abortAction, but attach the AbortError to it.
            return { ...abortAction, error: miniSerializeError(err) }
          }
          finalAction = rejected(err, requestId, arg)
        }

        // We dispatch the result action _after_ the catch, to avoid having any errors
        // here get swallowed by the try/catch block,
        // per https://twitter.com/dan_abramov/status/770914221638942720
        // and https://redux-toolkit.js.org/tutorials/advanced-tutorial#async-error-handling-logic-in-thunks
        dispatch(finalAction)
        return finalAction
      })()
      return Object.assign(promise, { abort })
    }
  }

  return Object.assign(actionCreator, {
    pending,
    rejected,
    fulfilled
  })
}

/**
 * @alpha
 */
export function unwrapResult<T>(
  returned: { error: any } | { payload: NonNullable<T> }
): NonNullable<T> {
  if ('error' in returned) {
    throw returned.error
  }
  return returned.payload
}
