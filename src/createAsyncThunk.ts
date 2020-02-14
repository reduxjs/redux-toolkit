import { Dispatch } from 'redux'
import nanoid from 'nanoid'
import { createAction } from './createAction'

type AsyncThunksArgs<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: S
  extra: E
  requestId: string
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

  const finished = createAction(
    type + '/finished',
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

      try {
        dispatch(pending(requestId, args))
        // TODO Also ugly types
        const result = (await payloadCreator(args, {
          dispatch,
          getState,
          extra,
          requestId
        } as TA)) as Returned

        // TODO How do we avoid errors in here from hitting the catch clause?
        return dispatch(fulfilled(result, requestId, args))
      } catch (err) {
        // TODO Errors aren't serializable
        dispatch(rejected(err, requestId, args))
      } finally {
        // TODO IS there really a benefit from a "finished" action?
        dispatch(finished(requestId, args))
      }
    }
  }

  actionCreator.pending = pending
  actionCreator.rejected = rejected
  actionCreator.fulfilled = fulfilled
  actionCreator.finished = finished

  return actionCreator
}
