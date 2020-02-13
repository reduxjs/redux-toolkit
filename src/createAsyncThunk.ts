import { Dispatch } from 'redux'
import { createAction } from './createAction'

type AsyncThunksArgs<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: S
  extra: E
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
    (result: Returned, args: ActionParams) => {
      return {
        payload: result,
        meta: { args }
      }
    }
  )

  const pending = createAction(type + '/pending', (args: ActionParams) => {
    return {
      payload: undefined,
      meta: { args }
    }
  })

  const finished = createAction(type + '/finished', (args: ActionParams) => {
    return {
      payload: undefined,
      meta: { args }
    }
  })

  const rejected = createAction(
    type + '/rejected',
    (error: Error, args: ActionParams) => {
      return {
        payload: undefined,
        error,
        meta: { args }
      }
    }
  )

  function actionCreator(args: ActionParams) {
    return async (
      dispatch: TA['dispatch'],
      getState: TA['getState'],
      extra: TA['extra']
    ) => {
      try {
        dispatch(pending(args))
        // TODO Also ugly types
        const result = (await payloadCreator(args, {
          dispatch,
          getState,
          extra
        } as TA)) as Returned

        // TODO How do we avoid errors in here from hitting the catch clause?
        return dispatch(fulfilled(result, args))
      } catch (err) {
        // TODO Errors aren't serializable
        dispatch(rejected(err, args))
      } finally {
        // TODO IS there really a benefit from a "finished" action?
        dispatch(finished(args))
      }
    }
  }

  actionCreator.pending = pending
  actionCreator.rejected = rejected
  actionCreator.fulfilled = fulfilled
  actionCreator.finished = finished

  return actionCreator
}
