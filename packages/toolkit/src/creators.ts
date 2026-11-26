import type { Action } from 'redux'
import type { AsyncThunkCreator } from './asyncThunkCreator'
import type { PayloadAction, PrepareAction } from './createAction'
import { createAction } from './createAction'
import type { CaseReducer } from './createReducer'
import type { TypedActionCreator } from './mapBuilders'
import type { TypeGuard } from './tsHelpers'

/**
 * The context passed to the `creators` callback of `createSlice`.
 *
 * Custom creator factories are ordinary generic functions over this context:
 *
 * ```ts
 * function myCreator<State, Name extends string>(ctx: CreatorContext<State, Name>) {
 *   return (config: MyConfig<State>) =>
 *     makeDefinition<MyExposure>((details, handling) => { ... })
 * }
 * ```
 *
 * `State` and `Name` flow through normal inference.
 *
 * @public
 */
export interface CreatorContext<State, Name extends string = string> {
  /**
   * Type carrier only. Always `null` at runtime.
   */
  $types: { state: State; name: Name } | null
  /**
   * The slice name.
   */
  name: Name
}

/**
 * The creators that `buildCreateSlice` accepts in its `creators` option, keyed
 * by name. Each entry is the type of `create.<name>` in a slice with the given
 * `State` and `Name`.
 *
 * Register a custom creator with module augmentation. The type parameters
 * must match this declaration exactly:
 *
 * ```ts
 * declare module '@reduxjs/toolkit' {
 *   interface SliceCreatorRegistry<State, Name extends string> {
 *     reset: () => ReducerDefinition<SliceActionExposure<void>>
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SliceCreatorRegistry<State, Name extends string> {
  asyncThunk: AsyncThunkCreator<State>
}

/**
 * A creator factory: called once per slice with that slice's creator
 * context, returning the function exposed on `create`.
 *
 * @public
 */
export type CreatorFactory = (
  ctx: CreatorContext<any, any>,
) => (...args: any[]) => ReducerDefinition<AnyExposure>

/**
 * Static details about the `reducers` field a definition was assigned to.
 *
 * @public
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
 * with the slice.
 *
 * @public
 */
export interface ReducerHandlingContext<State> {
  /**
   * Adds a case reducer to handle a single action type inside this slice's reducer.
   * Registering the same action type twice throws.
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
   * Returns the slice's initial state, calling the lazy initializer if one
   * was provided.
   */
  getInitialState(): State
}

/**
 * Describes what a definition exposes on `slice.actions` and
 * `slice.caseReducers`. Only used at the type level.
 *
 * @public
 */
export interface SliceActionExposure<Payload> {
  kind: 'sliceAction'
  payload: Payload
}

/** @public */
export interface PreparedActionExposure<PA extends PrepareAction<any>> {
  kind: 'prepared'
  prepare: PA
}

/** @public */
export interface ValueExposure<Value, CaseReducers> {
  kind: 'value'
  value: Value
  caseReducers: CaseReducers
}

/** @public */
export type AnyExposure =
  | SliceActionExposure<any>
  | PreparedActionExposure<any>
  | ValueExposure<any, any>

/**
 * What every creator returns. `$types` only carries the exposure type and is
 * always `null` at runtime; `handle` is called by `createSlice` with the
 * field details and the handling context.
 *
 * @public
 */
export interface ReducerDefinition<Exposure extends AnyExposure = AnyExposure> {
  $types: Exposure | null
  handle(details: ReducerDetails, context: ReducerHandlingContext<any>): void
}

/**
 * Creates a reducer definition for a custom creator.
 *
 * @public
 */
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
 * The creators always available on the `create` object passed to the
 * callback form of `reducers`.
 *
 * @public
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
    caseReducer: CaseReducer<State, ReturnType<ActionCreatorForPrepare<PA>>>,
  ): ReducerDefinition<PreparedActionExposure<PA>>
}

type ActionCreatorForPrepare<PA extends PrepareAction<any>> = (
  ...args: Parameters<PA>
) => PayloadAction<
  ReturnType<PA>['payload'],
  string,
  ReturnType<PA> extends { meta: infer M } ? M : never,
  ReturnType<PA> extends { error: infer E } ? E : never
>

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
