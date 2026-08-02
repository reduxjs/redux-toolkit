import type { Action } from 'redux'
import type { AsyncThunk, AsyncThunkConfig } from '../createAsyncThunk'
import { createAsyncThunk } from '../createAsyncThunk'
import type {
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
} from '../createAsyncThunk'
import type { PayloadAction, PrepareAction } from '../createAction'
import { createAction } from '../createAction'
import type {
  AsyncThunkReducers,
  CaseReducer,
  TypedActionCreator,
} from './createReducer'
import { isAnyOf } from '../matchers'
import type { TypeGuard } from '../tsHelpers'

/**
 * The token passed to the `creators` callback of `createSlice`.
 *
 * Custom creator factories are ordinary generic functions over this context:
 *
 * ```ts
 * function myCreator<State, Name extends string>(ctx: CreatorContext<State, Name>) {
 *   return (config: MyConfig<State>) => makeDefinition<MyExposure>((details, handling) => { ... })
 * }
 * ```
 *
 * `State` and `Name` flow through normal inference — no module augmentation,
 * no `buildCreateSlice`, no unexported symbols. (RTK 3.0 revision of the
 * custom-creators concept from issue #3837 / PRs #3894 and #4348.)
 */
export interface CreatorContext<State, Name extends string = string> {
  /**
   * Phantom type carrier. Always `null` at runtime.
   */
  $types: { state: State; name: Name } | null
  /**
   * The slice name, available at runtime when the `creators` callback runs.
   */
  name: Name
}

/**
 * Static details about the reducer field a definition was assigned to.
 */
export interface ReducerDetails {
  /** The `name` of the slice */
  sliceName: string
  /** The key the definition occupies in the `reducers` map */
  reducerName: string
  /** `${sliceName}/${reducerName}` */
  type: string
}

/**
 * The methods a definition's `handle` function can use to register behavior
 * with the slice. This is the public contract for custom creators.
 *
 * (In RTK 2.x this interface existed and was fully documented, but was never
 * exported — custom creators were closed by construction. RTK 3.0 exports it.)
 */
export interface ReducerHandlingContext<State> {
  /**
   * Adds a case reducer to handle a single action type inside this slice's reducer.
   * Duplicate action types throw immediately.
   */
  addCase(
    typeOrActionCreator: string | TypedActionCreator<string>,
    reducer: CaseReducer<State, any>,
  ): this
  /**
   * Adds a matcher case reducer. Matchers run after all case reducers,
   * in registration order (slice matchers before `respondTo` matchers).
   */
  addMatcher<A extends Action>(
    matcher: TypeGuard<A>,
    reducer: CaseReducer<State, A>,
  ): this
  /**
   * Exposes a value (usually an action creator, but any value works)
   * as `slice.actions[reducerName]`.
   */
  exposeAction(actionCreator: unknown): this
  /**
   * Exposes a value (usually the case reducer function or a map of them)
   * as `slice.caseReducers[reducerName]`.
   */
  exposeCaseReducer(caseReducer: unknown): this
  /**
   * Returns the slice's initial state (calling the lazy initializer if one
   * was provided). Useful for reset-style creators.
   */
  getInitialState(): State
}

/**
 * Exposure descriptors — the phantom payload carried on each definition's
 * `$types`. Mapped types in createSlice.ts read these to produce
 * `slice.actions` and `slice.caseReducers`. The `kind` discriminant is
 * type-level only.
 */
export interface SliceActionExposure<Payload> {
  kind: 'sliceAction'
  payload: Payload
}

export interface PreparedActionExposure<PA extends PrepareAction<any>> {
  kind: 'prepared'
  prepare: PA
}

export interface ValueExposure<Value, CaseReducers> {
  kind: 'value'
  value: Value
  caseReducers: CaseReducers
}

export type AnyExposure =
  | SliceActionExposure<any>
  | PreparedActionExposure<any>
  | ValueExposure<any, any>

/**
 * A reducer definition: what every creator returns. The `$types` member is a
 * phantom inference vehicle (always `null` at runtime); `handle` is the
 * runtime behavior, invoked eagerly by `createSlice` with the field details
 * and the handling context.
 */
export interface ReducerDefinition<Exposure extends AnyExposure = AnyExposure> {
  $types: Exposure | null
  handle(details: ReducerDetails, context: ReducerHandlingContext<any>): void
}

export function makeDefinition<Exposure extends AnyExposure>(
  handle: (
    details: ReducerDetails,
    context: ReducerHandlingContext<any>,
  ) => void,
): ReducerDefinition<Exposure> {
  return { $types: null, handle }
}

export function isReducerDefinition(
  value: unknown,
): value is ReducerDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$types' in value &&
    typeof (value as ReducerDefinition).handle === 'function'
  )
}

/**
 * The creators always available on the `create` object passed to a
 * callback-form `reducers` option.
 */
export interface BuiltinSliceCreators<State> {
  /**
   * Defines a slice case reducer, generating an action creator with the
   * payload type given as the type argument (default: no payload).
   */
  reducer(
    caseReducer: CaseReducer<State, PayloadAction>,
  ): ReducerDefinition<SliceActionExposure<void>>
  reducer<Payload>(
    caseReducer: CaseReducer<State, PayloadAction<Payload>>,
  ): ReducerDefinition<SliceActionExposure<Payload>>
  /**
   * Defines a slice case reducer with a `prepare` callback, generating an
   * action creator whose arguments and payload come from `prepare`.
   */
  preparedReducer<PA extends PrepareAction<any>>(
    prepare: PA,
    caseReducer: CaseReducer<
      State,
      ReturnType<_ActionCreatorForPrepare<PA>>
    >,
  ): ReducerDefinition<PreparedActionExposure<PA>>
}

type _ActionCreatorForPrepare<PA extends PrepareAction<any>> = (
  ...args: Parameters<PA>
) => ReturnType<PA> extends { payload: infer P }
  ? PayloadAction<P, string, any, any>
  : never

export function buildBuiltinCreators<State>(): BuiltinSliceCreators<State> {
  return {
    reducer(caseReducer: CaseReducer<State, PayloadAction<any>>) {
      return makeDefinition((details, context) => {
        context
          .addCase(details.type, caseReducer)
          .exposeAction(createAction(details.type))
          .exposeCaseReducer(caseReducer)
      })
    },
    preparedReducer(prepare, caseReducer) {
      return makeDefinition((details, context) => {
        context
          .addCase(details.type, caseReducer)
          .exposeAction(createAction(details.type, prepare))
          .exposeCaseReducer(caseReducer)
      })
    },
  } as BuiltinSliceCreators<State>
}

/**
 * The config accepted by the bound `asyncThunk` creator: the four lifecycle
 * case reducers plus `options` forwarded to `createAsyncThunk`.
 */
export interface AsyncThunkCreatorConfig<
  State,
  Returned,
  ThunkArg,
  Config extends AsyncThunkConfig = {},
> extends AsyncThunkReducers<State, ThunkArg, Returned, Config> {
  options?: AsyncThunkOptions<ThunkArg, Config>
}

export interface BoundAsyncThunkCreator<State> {
  <Returned, ThunkArg = void>(
    payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, {}>,
    config?: AsyncThunkCreatorConfig<State, Returned, ThunkArg>,
  ): ReducerDefinition<
    ValueExposure<
      AsyncThunk<Returned, ThunkArg, {}>,
      Required<AsyncThunkReducers<State, ThunkArg, Returned>>
    >
  >
}

const noop = () => {}

/**
 * The async thunk creator, as an ordinary import. Wiring it up:
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
 * This replaces RTK 2.x's `buildCreateSlice` + `asyncThunkCreator`-symbol
 * ritual. `createAsyncThunk` only lands in your bundle if this module is
 * imported — the split is import-graph-based and works in every bundler.
 */
export function asyncThunkCreator<State, Name extends string>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: CreatorContext<State, Name>,
): BoundAsyncThunkCreator<State> {
  return ((
    payloadCreator: AsyncThunkPayloadCreator<any, any, {}>,
    config: AsyncThunkCreatorConfig<State, any, any> = {},
  ) =>
    makeDefinition((details, context) => {
      const { options, pending, fulfilled, rejected, settled } = config
      const thunk = createAsyncThunk(details.type, payloadCreator, options)
      if (pending) context.addCase(thunk.pending, pending)
      if (fulfilled) context.addCase(thunk.fulfilled, fulfilled)
      if (rejected) context.addCase(thunk.rejected, rejected)
      if (settled) {
        context.addMatcher(isAnyOf(thunk.fulfilled, thunk.rejected), settled)
      }
      context.exposeAction(thunk).exposeCaseReducer({
        pending: pending || noop,
        fulfilled: fulfilled || noop,
        rejected: rejected || noop,
        settled: settled || noop,
      })
    })) as BoundAsyncThunkCreator<State>
}

/**
 * A small worked example of a custom creator: `create.reset()` defines an
 * action that resets the slice to its initial state.
 */
export function resetCreator<State, Name extends string>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: CreatorContext<State, Name>,
) {
  return (): ReducerDefinition<SliceActionExposure<void>> =>
    makeDefinition((details, context) => {
      const actionCreator = createAction(details.type)
      const caseReducer = () => context.getInitialState()
      context
        .addCase(actionCreator, caseReducer)
        .exposeAction(actionCreator)
        .exposeCaseReducer(caseReducer)
    })
}
