import type {
  AsyncThunk,
  AsyncThunkConfig,
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
  OverrideThunkApiConfigs,
} from './createAsyncThunk'
import { createAsyncThunk } from './createAsyncThunk'
import type { CaseReducer } from './createReducer'
import type { ReducerCreator, ReducerDefinition } from './createSlice'
import { ReducerType } from './createSlice'

export interface AsyncThunkSliceReducerConfig<
  State,
  ThunkArg extends any,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = {},
> {
  pending?: CaseReducer<
    State,
    ReturnType<AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['pending']>
  >
  rejected?: CaseReducer<
    State,
    ReturnType<AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['rejected']>
  >
  fulfilled?: CaseReducer<
    State,
    ReturnType<AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['fulfilled']>
  >
  settled?: CaseReducer<
    State,
    ReturnType<
      AsyncThunk<Returned, ThunkArg, ThunkApiConfig>['rejected' | 'fulfilled']
    >
  >
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
}

export interface AsyncThunkSliceReducerDefinition<
  State,
  ThunkArg extends any,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = {},
> extends AsyncThunkSliceReducerConfig<
      State,
      ThunkArg,
      Returned,
      ThunkApiConfig
    >,
    ReducerDefinition<ReducerType.asyncThunk> {
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>
}

/**
 * Providing these as part of the config would cause circular types, so we disallow passing them
 */
type PreventCircular<ThunkApiConfig> = {
  [K in keyof ThunkApiConfig]: K extends 'state' | 'dispatch'
    ? never
    : ThunkApiConfig[K]
}

export interface AsyncThunkCreator<
  State,
  CurriedThunkApiConfig extends
    PreventCircular<AsyncThunkConfig> = PreventCircular<AsyncThunkConfig>,
> {
  <Returned, ThunkArg = void>(
    payloadCreator: AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      CurriedThunkApiConfig
    >,
    config?: AsyncThunkSliceReducerConfig<
      State,
      ThunkArg,
      Returned,
      CurriedThunkApiConfig
    >,
  ): AsyncThunkSliceReducerDefinition<
    State,
    ThunkArg,
    Returned,
    CurriedThunkApiConfig
  >
  <
    Returned,
    ThunkArg,
    ThunkApiConfig extends PreventCircular<AsyncThunkConfig> = {},
  >(
    payloadCreator: AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      ThunkApiConfig
    >,
    config?: AsyncThunkSliceReducerConfig<
      State,
      ThunkArg,
      Returned,
      ThunkApiConfig
    >,
  ): AsyncThunkSliceReducerDefinition<State, ThunkArg, Returned, ThunkApiConfig>
  withTypes<
    ThunkApiConfig extends PreventCircular<AsyncThunkConfig>,
  >(): AsyncThunkCreator<
    State,
    OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>
  >
}

export const asyncThunkCreator: ReducerCreator<ReducerType.asyncThunk> = {
  type: ReducerType.asyncThunk,
  create: /* @__PURE__ */ (() => {
    function asyncThunk(
      payloadCreator: AsyncThunkPayloadCreator<any, any>,
      config: AsyncThunkSliceReducerConfig<any, any>,
    ): AsyncThunkSliceReducerDefinition<any, any> {
      return {
        _reducerDefinitionType: ReducerType.asyncThunk,
        payloadCreator,
        ...config,
      }
    }
    asyncThunk.withTypes = () => asyncThunk
    return asyncThunk as AsyncThunkCreator<any>
  })(),
  handle({ type }, definition, context) {
    const { payloadCreator, fulfilled, pending, rejected, settled, options } =
      definition
    const thunk = createAsyncThunk(type, payloadCreator, options as any)
    context.exposeAction(thunk)

    if (fulfilled) {
      context.addCase(thunk.fulfilled, fulfilled)
    }
    if (pending) {
      context.addCase(thunk.pending, pending)
    }
    if (rejected) {
      context.addCase(thunk.rejected, rejected)
    }
    if (settled) {
      context.addMatcher(thunk.settled, settled)
    }

    context.exposeCaseReducer({
      fulfilled: fulfilled || noop,
      pending: pending || noop,
      rejected: rejected || noop,
      settled: settled || noop,
    })
  },
}

function noop() {}
