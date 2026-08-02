import type { Action, Reducer, UnknownAction } from 'redux'
import type { AsyncThunk, AsyncThunkConfig } from '../createAsyncThunk'
import { executeReducerBuilderCallback } from '../mapBuilders'
import type { TypeGuard } from '../tsHelpers'
import type { Draft, ImmutabilityAdapter } from './immutability'

/**
 * RTK 3.0 createReducer prototype.
 *
 * Two differences from 2.x `createReducer`:
 * - The immutable-update logic comes from an `ImmutabilityAdapter` argument
 *   instead of a direct `immer` import. The three-branch dispatch (existing
 *   draft / non-draftable / produce) is unchanged, just routed through the
 *   adapter.
 * - `CaseReducer` and the builder types below are typed with the RTK-owned
 *   `Draft` from `./immutability`, not Immer's. The two are structural
 *   copies (guarded by a type-equality test), so 2.x case reducers remain
 *   assignable, but no v3 public signature imports from `immer`.
 *
 * The builder callback is executed by the 2.x
 * `executeReducerBuilderCallback` runtime, which has no immer dependency;
 * only its parameter types differ (structurally identical), hence the one
 * cast at the call site.
 */

export type NotFunction<T> = T extends Function ? never : T

/**
 * A case reducer: handles one action type. May mutate the draft and return
 * nothing, or return the next state. (With a non-drafting adapter such as
 * `noopAdapter`, the "draft" is the current state itself and returning the
 * next state is required.)
 */
export type CaseReducer<S = any, A extends Action = UnknownAction> = (
  state: Draft<S>,
  action: A,
) => NoInfer<S> | void | Draft<NoInfer<S>>

export interface ReducerWithInitialState<S extends NotFunction<any>>
  extends Reducer<S> {
  getInitialState: () => S
}

export type AsyncThunkReducers<
  State,
  ThunkArg extends any,
  Returned = unknown,
  ThunkApiConfig extends AsyncThunkConfig = {},
> = {
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
}

export type TypedActionCreator<Type extends string> = {
  (...args: any[]): Action<Type>
  type: Type
}

/**
 * A builder for an action <-> reducer map. Identical to the 2.x builder
 * except that all case reducers are typed with the RTK-owned `Draft`.
 */
export interface ActionReducerMapBuilder<State> {
  /**
   * Adds a case reducer to handle a single action type, identified by an
   * action creator. Must come before any `addMatcher`/`addDefaultCase`.
   */
  addCase<ActionCreator extends TypedActionCreator<string>>(
    actionCreator: ActionCreator,
    reducer: CaseReducer<State, ReturnType<ActionCreator>>,
  ): ActionReducerMapBuilder<State>
  /**
   * Adds a case reducer to handle a single action type, identified by a
   * plain type string.
   */
  addCase<Type extends string, A extends Action<Type>>(
    type: Type,
    reducer: CaseReducer<State, A>,
  ): ActionReducerMapBuilder<State>

  /**
   * Adds case reducers for an async thunk's lifecycle actions.
   */
  addAsyncThunk<
    Returned,
    ThunkArg,
    ThunkApiConfig extends AsyncThunkConfig = {},
  >(
    asyncThunk: AsyncThunk<Returned, ThunkArg, ThunkApiConfig>,
    reducers: AsyncThunkReducers<State, ThunkArg, Returned, ThunkApiConfig>,
  ): Omit<ActionReducerMapBuilder<State>, 'addCase'>

  /**
   * Adds a case reducer guarded by a matcher function. All matching
   * matchers run, in definition order, after any exact case reducer.
   */
  addMatcher<A>(
    matcher: TypeGuard<A> | ((action: any) => boolean),
    reducer: CaseReducer<State, A extends Action ? A : A & Action>,
  ): Omit<ActionReducerMapBuilder<State>, 'addCase' | 'addAsyncThunk'>

  /**
   * Adds a "default case" reducer, run when no case reducer and no matcher
   * handled the action.
   */
  addDefaultCase(reducer: CaseReducer<State, Action>): {}
}

function isStateFunction<S>(x: unknown): x is () => S {
  return typeof x === 'function'
}

/**
 * The public shape of `createReducer`: the immutability adapter is bound
 * by `buildCreateReducer`, with an optional per-call override.
 */
export type CreateReducer = <S extends NotFunction<any>>(
  initialState: S | (() => S),
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  immutability?: ImmutabilityAdapter,
) => ReducerWithInitialState<S>

export interface BuildCreateReducerConfig {
  immutability: ImmutabilityAdapter
}

/**
 * Builds a `createReducer` bound to a default immutability adapter.
 * The default export from the package index is
 * `buildCreateReducer({ immutability: immerAdapter })`, so Immer stays
 * the zero-config default. A per-call adapter argument overrides the
 * bound default, mirroring the per-slice `immutability` option on
 * `createSlice`.
 */
export function buildCreateReducer(
  config: BuildCreateReducerConfig,
): CreateReducer {
  const defaultAdapter = config?.immutability
  if (!defaultAdapter) {
    throw new Error(
      'buildCreateReducer requires an `immutability` adapter. Use `immerAdapter` for 2.x-equivalent behavior.',
    )
  }
  return (initialState, builderCallback, immutability) =>
    createReducerImpl(initialState, builderCallback, immutability ?? defaultAdapter)
}

export function createReducerImpl<S extends NotFunction<any>>(
  initialState: S | (() => S),
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void,
  adapter: ImmutabilityAdapter,
): ReducerWithInitialState<S> {
  if (typeof builderCallback !== 'function') {
    throw new Error(
      'createReducer requires a builder callback as its second argument',
    )
  }

  const [actionsMap, finalActionMatchers, finalDefaultCaseReducer] =
    executeReducerBuilderCallback<S>(builderCallback as any)

  const freezeDraftable = <T>(val: T) => adapter.freezeDraftable(val)

  let getInitialState: () => S
  if (isStateFunction<S>(initialState)) {
    getInitialState = () => freezeDraftable(initialState())
  } else {
    const frozenInitialState = freezeDraftable(initialState)
    getInitialState = () => frozenInitialState
  }

  function reducer(state = getInitialState(), action: any): S {
    let caseReducers = [
      actionsMap[action.type],
      ...finalActionMatchers
        .filter(({ matcher }) => matcher(action))
        .map(({ reducer }) => reducer),
    ]
    if (caseReducers.filter((cr) => !!cr).length === 0) {
      caseReducers = [finalDefaultCaseReducer]
    }

    return caseReducers.reduce((previousState, caseReducer): S => {
      if (caseReducer) {
        if (adapter.isDraft(previousState)) {
          // We are already inside a `produce` call (nested createReducer /
          // createSlice, or an outer draft). Pass the draft through.
          const draft = previousState as Draft<S>
          const result = caseReducer(draft, action)

          if (result === undefined) {
            return previousState
          }

          return result as S
        } else if (!adapter.isDraftable(previousState)) {
          // Not draftable (a primitive, or any value under `noopAdapter`):
          // call the case reducer directly; it must return the next state.
          const result = caseReducer(previousState as any, action)

          if (result === undefined) {
            if (previousState === null) {
              return previousState
            }
            throw Error(
              'A case reducer on a non-draftable value must not return undefined',
            )
          }

          return result as S
        } else {
          return adapter.produce(previousState, (draft) =>
            caseReducer(draft, action),
          ) as S
        }
      }

      return previousState
    }, state)
  }

  reducer.getInitialState = getInitialState

  return reducer as ReducerWithInitialState<S>
}
