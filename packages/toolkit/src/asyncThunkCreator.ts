import type {
  AsyncThunk,
  AsyncThunkConfig,
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
  OverrideThunkApiConfigs,
} from './createAsyncThunk'
import { createAsyncThunk } from './createAsyncThunk'
import type {
  CreatorContext,
  ReducerDefinition,
  ValueExposure,
} from './creators'
import { makeDefinition } from './creators'
import type { AsyncThunkReducers } from './mapBuilders'

/**
 * The config accepted by `create.asyncThunk`: the lifecycle case reducers
 * plus `options` forwarded to `createAsyncThunk`.
 *
 * @public
 */
export type AsyncThunkCreatorConfig<
  State,
  ThunkArg,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = {},
> = AsyncThunkReducers<State, ThunkArg, Returned, ThunkApiConfig> & {
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
}

/**
 * The definition returned by `create.asyncThunk`.
 *
 * @public
 */
export type AsyncThunkDefinition<
  State,
  ThunkArg,
  Returned,
  ThunkApiConfig extends AsyncThunkConfig,
> = ReducerDefinition<
  ValueExposure<
    AsyncThunk<Returned, ThunkArg, ThunkApiConfig>,
    Required<AsyncThunkReducers<State, ThunkArg, Returned, ThunkApiConfig>>
  >
>

/**
 * Providing these as part of the config would cause circular types, so we disallow passing them
 */
type PreventCircular<ThunkApiConfig> = {
  [K in keyof ThunkApiConfig]: K extends 'state' | 'dispatch'
    ? never
    : ThunkApiConfig[K]
}

/**
 * `create.asyncThunk`, as bound by `asyncThunkCreator`.
 *
 * @public
 */
export interface AsyncThunkCreator<
  State,
  CurriedThunkApiConfig extends PreventCircular<AsyncThunkConfig> =
    PreventCircular<AsyncThunkConfig>,
> {
  <Returned, ThunkArg = void>(
    payloadCreator: AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      CurriedThunkApiConfig
    >,
    config?: AsyncThunkCreatorConfig<
      State,
      ThunkArg,
      Returned,
      CurriedThunkApiConfig
    >,
  ): AsyncThunkDefinition<State, ThunkArg, Returned, CurriedThunkApiConfig>
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
    config?: AsyncThunkCreatorConfig<State, ThunkArg, Returned, ThunkApiConfig>,
  ): AsyncThunkDefinition<State, ThunkArg, Returned, ThunkApiConfig>
  withTypes<
    ThunkApiConfig extends PreventCircular<AsyncThunkConfig>,
  >(): AsyncThunkCreator<
    State,
    OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>
  >
}

function noop() {}

/**
 * Binds the async thunk creator for a slice:
 *
 * ```ts
 * import { createSlice, asyncThunkCreator } from '@reduxjs/toolkit'
 *
 * const slice = createSlice({
 *   name: 'todos',
 *   initialState,
 *   creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
 *   reducers: (create) => ({
 *     fetchTodo: create.asyncThunk(async (id: string) => { ... }, {
 *       fulfilled: (state, action) => { ... },
 *     }),
 *   }),
 * })
 * ```
 *
 * `createAsyncThunk` is only bundled when this function is imported.
 *
 * @public
 */
export function asyncThunkCreator<State, Name extends string>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: CreatorContext<State, Name>,
): AsyncThunkCreator<State> {
  function asyncThunk(
    payloadCreator: AsyncThunkPayloadCreator<any, any>,
    config: AsyncThunkCreatorConfig<State, any, any> = {},
  ) {
    return makeDefinition((details, context) => {
      const { options, pending, fulfilled, rejected, settled } = config
      const thunk = createAsyncThunk(
        details.type,
        payloadCreator,
        options as any,
      )
      if (pending) context.addCase(thunk.pending, pending)
      if (fulfilled) context.addCase(thunk.fulfilled, fulfilled)
      if (rejected) context.addCase(thunk.rejected, rejected)
      if (settled) context.addMatcher(thunk.settled, settled)
      context.exposeAction(thunk).exposeCaseReducer({
        pending: pending || noop,
        fulfilled: fulfilled || noop,
        rejected: rejected || noop,
        settled: settled || noop,
      })
    })
  }
  asyncThunk.withTypes = () => asyncThunk
  return asyncThunk as AsyncThunkCreator<State>
}
