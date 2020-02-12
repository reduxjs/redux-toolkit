import { Dispatch } from 'redux'
import { ActionCreatorWithPayload, createAction } from './createAction'

export type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown
}
  ? U
  : T

export interface AsyncThunkParams<
  A,
  D extends Dispatch,
  S extends unknown,
  E extends unknown
> {
  args: A
  dispatch: D
  getState: () => S
  extra: E
}

export type AsyncActionCreator<
  A,
  D extends Dispatch,
  S extends unknown,
  E extends unknown
> = (params: AsyncThunkParams<A, D, S, E>) => any

/**
 *
 * @param type
 * @param payloadCreator
 *
 * @alpha
 */
export function createAsyncThunk<
  ActionType extends string,
  PayloadCreator extends AsyncActionCreator<
    unknown,
    Dispatch,
    unknown,
    undefined
  >
>(type: ActionType, payloadCreator: PayloadCreator) {
  type ActionParams = Parameters<PayloadCreator>[0]['args']

  const fulfilled = createAction(type) as ActionCreatorWithPayload<
    { args: ActionParams; result: Await<ReturnType<PayloadCreator>> },
    ActionType
  >

  const pending = createAction(type + '/pending') as ActionCreatorWithPayload<
    { args: ActionParams },
    string
  >

  const finished = createAction(type + '/finished') as ActionCreatorWithPayload<
    { args: ActionParams },
    string
  >

  const rejected = createAction(type + '/rejected') as ActionCreatorWithPayload<
    { args: ActionParams; error: Error },
    string
  >

  function actionCreator(args?: ActionParams) {
    return async (dispatch: any, getState: any, extra: any) => {
      try {
        dispatch(pending({ args }))
        const result: Await<ReturnType<PayloadCreator>> = await payloadCreator({
          args,
          dispatch,
          getState,
          extra
        })
        // TODO How do we avoid errors in here from hitting the catch clause?
        return dispatch(fulfilled({ args, result }))
      } catch (err) {
        // TODO Errors aren't serializable
        dispatch(rejected({ args, error: err }))
      } finally {
        dispatch(finished({ args }))
      }
    }
  }

  actionCreator.pending = pending
  actionCreator.rejected = rejected
  actionCreator.fulfilled = fulfilled
  actionCreator.finished = finished

  return actionCreator
}
