import { Dispatch } from 'redux'
import nanoid from 'nanoid'
import { createAction } from './createAction'

type AsyncThunksArgs<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: S
  extra: E
  requestId: string
  signal: AbortSignal
}

interface SimpleError {
  name?: string
  message?: string
  stack?: string
  code?: string
}

const commonProperties: (keyof SimpleError)[] = [
  'name',
  'message',
  'stack',
  'code'
]

// Reworked from https://github.com/sindresorhus/serialize-error
export const miniSerializeError = (value: any): any => {
  if (typeof value === 'object' && value !== null) {
    const simpleError: SimpleError = {}
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
  ActionParams = void,
  TA extends AsyncThunksArgs<any, any, any> = AsyncThunksArgs<
    unknown,
    unknown,
    Dispatch
  >
>(
  type: ActionType,
  payloadCreator: (
    args: ActionParams,
    thunkArgs: TA
  ) => Promise<Returned> | Returned
) {
  const fulfilled = createAction(
    type + '/fulfilled',
    (result: Returned, requestId: string, args: ActionParams) => {
      return {
        payload: result,
        meta: { args, requestId }
      }
    }
  )

  const pending = createAction(
    type + '/pending',
    (requestId: string, args: ActionParams) => {
      return {
        payload: undefined,
        meta: { args, requestId }
      }
    }
  )

  const rejected = createAction(
    type + '/rejected',
    (error: Error, requestId: string, args: ActionParams) => {
      return {
        payload: undefined,
        error: miniSerializeError(error),
        meta: {
          args,
          requestId,
          ...(error.name === 'AbortError' && {
            aborted: true,
            abortReason: error.message
          })
        }
      }
    }
  )

  function actionCreator(args: ActionParams) {
    const abortController = new AbortController()

    return function thunkAction(
      dispatch: TA['dispatch'],
      getState: TA['getState'],
      extra: TA['extra']
    ) {
      const requestId = nanoid()
      let abortAction: ReturnType<typeof rejected> | undefined

      function abort(reason: string = 'Aborted.') {
        abortController.abort()
        abortAction = rejected(
          { name: 'AbortError', message: reason },
          requestId,
          args
        )
        dispatch(abortAction)
      }

      const promise = (async function() {
        let finalAction: ReturnType<typeof fulfilled | typeof rejected>
        try {
          dispatch(pending(requestId, args))

          finalAction = fulfilled(
            await payloadCreator(args, {
              dispatch,
              getState,
              extra,
              requestId,
              signal: abortController.signal
            } as TA),
            requestId,
            args
          )
        } catch (err) {
          if (err && err.name === 'AbortError' && abortAction) {
            // abortAction has already been dispatched, no further action should be dispatched
            // by this thunk.
            // return a copy of the dispatched abortAction, but attach the AbortError to it.
            return { ...abortAction, error: miniSerializeError(err) }
          }
          finalAction = rejected(err, requestId, args)
        }

        // We dispatch "success" _after_ the catch, to avoid having any errors
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
