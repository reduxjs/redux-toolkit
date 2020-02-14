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
  ActionParams = never,
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
    (result: Returned, args: ActionParams, requestId: string) => {
      return {
        payload: result,
        meta: { args, requestId }
      }
    }
  )

  const pending = createAction(
    type + '/pending',
    (args: ActionParams, requestId: string) => {
      return {
        payload: undefined,
        meta: { args, requestId }
      }
    }
  )

  const finished = createAction(
    type + '/finished',
    (args: ActionParams, requestId: string) => {
      return {
        payload: undefined,
        meta: { args, requestId }
      }
    }
  )

  const rejected = createAction(
    type + '/rejected',
    (error: Error, args: ActionParams, requestId: string) => {
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
        dispatch(pending(args, requestId))
        // TODO Also ugly types
        const result = (await payloadCreator(args, {
          dispatch,
          getState,
          extra,
          requestId
        } as TA)) as Returned

        // TODO How do we avoid errors in here from hitting the catch clause?
        return dispatch(fulfilled(result, args, requestId))
      } catch (err) {
        // TODO Errors aren't serializable
        dispatch(rejected(err, args, requestId))
      } finally {
        // TODO IS there really a benefit from a "finished" action?
        dispatch(finished(args, requestId))
      }
    }
  }

  actionCreator.pending = pending
  actionCreator.rejected = rejected
  actionCreator.fulfilled = fulfilled
  actionCreator.finished = finished

  return actionCreator
}
