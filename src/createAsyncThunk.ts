import { Dispatch } from 'redux'
import { createAction } from './createAction'

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
  // TODO This results in some hideous-looking inferred types for the actions
  type ActionParams = Parameters<PayloadCreator>[0]['args']

  const fulfilled = createAction(
    type + '/fulfilled',
    (result: Await<ReturnType<PayloadCreator>>, args: ActionParams) => {
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

  function actionCreator(args?: ActionParams) {
    return async (dispatch: any, getState: any, extra: any) => {
      try {
        dispatch(pending(args))
        // TODO Also ugly types
        const result: Await<ReturnType<PayloadCreator>> = await payloadCreator({
          args,
          dispatch,
          getState,
          extra
        })

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
