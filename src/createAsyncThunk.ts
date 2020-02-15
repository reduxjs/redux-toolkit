import { Dispatch } from 'redux'
import nanoid from 'nanoid'
import { createAction } from './createAction'

type AsyncThunksArgs<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: S
  extra: E
  requestId: string
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
        error,
        meta: { args, requestId }
      }
    }
  )

  function actionCreator(args: ActionParams) {
    return async (
      dispatch: TA['dispatch'],
      getState: TA['getState'],
      extra: TA['extra']
    ) => {
      const requestId = nanoid()

      let result: Returned
      try {
        dispatch(pending(requestId, args))

        result = (await payloadCreator(args, {
          dispatch,
          getState,
          extra,
          requestId
        } as TA)) as Returned
      } catch (err) {
        const serializedError = miniSerializeError(err)
        dispatch(rejected(serializedError, requestId, args))
        // Rethrow this so the user can handle if desired
        throw err
      }

      // We dispatch "success" _after_ the catch, to avoid having any errors
      // here get swallowed by the try/catch block,
      // per https://twitter.com/dan_abramov/status/770914221638942720
      // and https://redux-toolkit.js.org/tutorials/advanced-tutorial#async-error-handling-logic-in-thunks
      return dispatch(fulfilled(result!, requestId, args))
    }
  }

  actionCreator.pending = pending
  actionCreator.rejected = rejected
  actionCreator.fulfilled = fulfilled

  return actionCreator
}
