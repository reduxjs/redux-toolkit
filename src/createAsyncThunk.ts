import { Dispatch, AnyAction } from 'redux'
import {
  createAction,
  PayloadAction,
  ActionCreatorWithPreparedPayload
} from './createAction'
import { ThunkDispatch } from 'redux-thunk'
import { FallbackIfUnknown } from './tsHelpers'
import { nanoid } from './nanoid'

// @ts-ignore we need the import of these types due to a bundling issue.
type _Keep = PayloadAction | ActionCreatorWithPreparedPayload<any, unknown>

export type BaseThunkAPI<
  S,
  E,
  D extends Dispatch = Dispatch,
  RejectedValue = undefined
> = {
  dispatch: D
  getState: () => S
  extra: E
  requestId: string
  signal: AbortSignal
  rejectWithValue(value: RejectedValue): RejectWithValue<RejectedValue>
}

/**
 * @public
 */
export interface SerializedError {
  name?: string
  message?: string
  stack?: string
  code?: string
}

const commonProperties: Array<keyof SerializedError> = [
  'name',
  'message',
  'stack',
  'code'
]

class RejectWithValue<RejectValue> {
  constructor(public readonly value: RejectValue) {}
}

// Reworked from https://github.com/sindresorhus/serialize-error
export const miniSerializeError = (value: any): SerializedError => {
  if (typeof value === 'object' && value !== null) {
    const simpleError: SerializedError = {}
    for (const property of commonProperties) {
      if (typeof value[property] === 'string') {
        simpleError[property] = value[property]
      }
    }

    return simpleError
  }

  return { message: String(value) }
}

type AsyncThunkConfig = {
  state?: unknown
  dispatch?: Dispatch
  extra?: unknown
  rejectValue?: unknown
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
  GetDispatch<ThunkApiConfig>,
  GetRejectValue<ThunkApiConfig>
>

type GetRejectValue<ThunkApiConfig> = ThunkApiConfig extends {
  rejectValue: infer RejectValue
}
  ? RejectValue
  : unknown

/**
 *
 * @param type
 * @param payloadCreator
 *
 * @public
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
  ) =>
    | Promise<Returned | RejectWithValue<GetRejectValue<ThunkApiConfig>>>
    | Returned
    | RejectWithValue<GetRejectValue<ThunkApiConfig>>
) {
  type RejectedValue = GetRejectValue<ThunkApiConfig>

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
    (
      error: Error | null,
      requestId: string,
      arg: ThunkArg,
      payload?: RejectedValue
    ) => {
      const aborted = !!error && error.name === 'AbortError'
      return {
        payload,
        error: miniSerializeError(error || 'Rejected'),
        meta: {
          arg,
          requestId,
          aborted
        }
      }
    }
  )

  let displayedWarning = false

  const AC =
    typeof AbortController !== 'undefined'
      ? AbortController
      : class implements AbortController {
          signal: AbortSignal = {
            aborted: false,
            addEventListener() {},
            dispatchEvent() {
              return false
            },
            onabort() {},
            removeEventListener() {}
          }
          abort() {
            if (process.env.NODE_ENV !== 'production') {
              if (!displayedWarning) {
                displayedWarning = true
                console.info(
                  `This platform does not implement AbortController. 
If you want to use the AbortController to react to \`abort\` events, please consider importing a polyfill like 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'.`
                )
              }
            }
          }
        }

  function actionCreator(arg: ThunkArg) {
    return (
      dispatch: GetDispatch<ThunkApiConfig>,
      getState: () => GetState<ThunkApiConfig>,
      extra: GetExtra<ThunkApiConfig>
    ) => {
      const requestId = nanoid()

      const abortController = new AC()
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
                signal: abortController.signal,
                rejectWithValue(value: RejectedValue) {
                  return new RejectWithValue(value)
                }
              })
            ).then(result => {
              if (result instanceof RejectWithValue) {
                return rejected(null, requestId, arg, result.value)
              }
              return fulfilled(result, requestId, arg)
            })
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

type ActionTypesWithOptionalErrorAction =
  | { error: any }
  | { error?: never; payload: any }
type PayloadForActionTypesExcludingErrorActions<T> = T extends { error: any }
  ? never
  : T extends { payload: infer P }
  ? P
  : never

/**
 * @public
 */
export function unwrapResult<R extends ActionTypesWithOptionalErrorAction>(
  returned: R
): PayloadForActionTypesExcludingErrorActions<R> {
  if ('error' in returned) {
    throw returned.error
  }
  return (returned as any).payload
}
