import { Dispatch } from 'redux'
import nanoid from 'nanoid'
import { createAction } from './createAction'

type AsyncThunksArgs<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: S
  extra: E
  requestId: string
}

interface ThunkActionCreatorConfig {
  type: string
  rethrow?: boolean
}

type ActionType = string | ThunkActionCreatorConfig

function isConfig(type: ActionType): type is ThunkActionCreatorConfig {
  return (type as ThunkActionCreatorConfig).type !== undefined
}

function buildOptions(
  config: string | ThunkActionCreatorConfig
): ThunkActionCreatorConfig {
  return isConfig(config)
    ? config
    : {
        type: config,
        rethrow: false
      }
}

/**
 *
 * @param config
 * @param payloadCreator
 *
 * @alpha
 */
export function createAsyncThunk<
  ActionType extends string | ThunkActionCreatorConfig,
  Returned,
  ActionParams = void,
  TA extends AsyncThunksArgs<any, any, any> = AsyncThunksArgs<
    unknown,
    unknown,
    Dispatch
  >
>(
  config: ActionType,
  payloadCreator: (
    args: ActionParams,
    thunkArgs: TA
  ) => Promise<Returned> | Returned
) {
  const { type, rethrow } = buildOptions(config)

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
        if (rethrow) throw err
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
