import { Dispatch, AnyAction } from 'redux'
import nanoid from 'nanoid'
import {
  createAction,
  PayloadAction,
  ActionCreatorWithPreparedPayload
} from './createAction'
import { ThunkDispatch } from 'redux-thunk'
import { FallbackIfUnknown } from './tsHelpers'

// @ts-ignore we need the import of these types due to a bundling issue.
type _Keep = PayloadAction | ActionCreatorWithPreparedPayload<any, unknown>

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

type AsyncThunkConfig = {
  state?: unknown
  dispatch?: Dispatch
  extra?: unknown
}

type GetState<ThunkApiConfig> = ThunkApiConfig extends {
  state: infer State
}
  ? State
  : unknown
type GetExtra<ThunkApiConfig> = ThunkApiConfig extends { extra: infer Extra }
  ? Extra
  : unknown
type GetDispatch<ThunkApiConfig> = ThunkApiConfig extends {
  dispatch: infer Dispatch
}
  ? FallbackIfUnknown<
      Dispatch,
      ThunkDispatch<
        GetState<ThunkApiConfig>,
        GetExtra<ThunkApiConfig>,
        AnyAction
      >
    >
  : ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, AnyAction>

type GetThunkAPI<ThunkApiConfig> = BaseThunkAPI<
  GetState<ThunkApiConfig>,
  GetExtra<ThunkApiConfig>,
  GetDispatch<ThunkApiConfig>
>

/**
 *
 * @param type
 * @param payloadCreator
 *
 * @alpha
 */
export function createAsyncThunk<
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends AsyncThunkConfig = {}
>(
  type: string,
  payloadCreator: (
    arg: ThunkArg,
    thunkAPI: GetThunkAPI<ThunkApiConfig>
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
          aborted
        }
      }
    }
  )

  function actionCreator(arg: ThunkArg) {
    return (
      dispatch: GetDispatch<ThunkApiConfig>,
      getState: () => GetState<ThunkApiConfig>,
      extra: GetExtra<ThunkApiConfig>
    ) => {
      const requestId = nanoid()

      const abortController = new AbortController()
      let abortReason: string | undefined

      const abortedPromise = new Promise<never>((_, reject) =>
        abortController.signal.addEventListener('abort', () =>
          reject({ name: 'AbortError', message: abortReason || 'Aborted' })
        )
      )

      function abort(reason?: string) {
        abortReason = reason
        abortController.abort()
      }

      const promise = (async function() {
        let finalAction: ReturnType<typeof fulfilled | typeof rejected>
        try {
          dispatch(pending(requestId, arg))
          finalAction = await Promise.race([
            abortedPromise,
            Promise.resolve(
              payloadCreator(arg, {
                dispatch,
                getState,
                extra,
                requestId,
                signal: abortController.signal
              })
            ).then(result => fulfilled(result, requestId, arg))
          ])
        } catch (err) {
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
