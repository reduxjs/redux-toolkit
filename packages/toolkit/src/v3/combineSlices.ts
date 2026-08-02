import type { Reducer, StateFromReducersMapObject, UnknownAction } from 'redux'
import { combineReducers } from 'redux'
import { nanoid } from '../nanoid'
import type {
  Id,
  NonUndefined,
  Tail,
  UnionToIntersection,
  WithOptionalProp,
} from '../tsHelpers'
import { getOrInsertComputed } from '../utils'

/**
 * RTK 3.0 combineSlices prototype.
 *
 * Differences from 2.x:
 * - The state proxy's missing-slice fallback prefers the injected reducer's
 *   own `getInitialState()` when it exists, and only falls back to probing
 *   the reducer with a random action type for bare reducers that don't
 *   expose one (e.g. RTKQ's `api.reducer`). This makes `combined.selector`,
 *   `slice.getInitialState()`, and injected slice selectors agree — in 2.x
 *   they diverge for slices with a stateful default case or type-agnostic
 *   matcher (entanglement E1). `getInitialState()` is the canonical answer.
 * - The "inject without overrideExisting" conflict message logs in every
 *   mode (2.x gated it to NODE_ENV === 'development', so it was silent in
 *   production *and* in tests).
 *
 * Deliberately out of scope for this spike: the PreloadedState type
 * parameter (2.x threads a third generic through for preloaded-state
 * shapes; the runtime here doesn't care).
 */

export type SliceLike<ReducerPath extends string, State> = {
  reducerPath: ReducerPath
  reducer: Reducer<State>
}

type AnySliceLike = SliceLike<string, any>

type SliceLikeReducerPath<A extends AnySliceLike> =
  A extends SliceLike<infer ReducerPath, any> ? ReducerPath : never

type SliceLikeState<A extends AnySliceLike> =
  A extends SliceLike<any, infer State> ? State : never

export type WithSlice<A extends AnySliceLike> = {
  [Path in SliceLikeReducerPath<A>]: SliceLikeState<A>
}

type ReducerMap = Record<string, Reducer>

type ExistingSliceLike<DeclaredState> = {
  [ReducerPath in keyof DeclaredState]: SliceLike<
    ReducerPath & string,
    NonUndefined<DeclaredState[ReducerPath]>
  >
}[keyof DeclaredState]

export type InjectConfig = {
  /**
   * Allow replacing a reducer with a different reference. Normally an error
   * is logged and the injection skipped if a different reducer instance is
   * already registered under the same path.
   */
  overrideExisting?: boolean
}

export interface CombinedSliceReducer<
  InitialState,
  DeclaredState extends InitialState = InitialState,
> extends Reducer<DeclaredState, UnknownAction, Partial<DeclaredState>> {
  /**
   * Declares slice types that will be injected lazily, usually via
   * interface merging on a `LazyLoadedSlices` interface.
   */
  withLazyLoadedSlices<Lazy = {}>(): CombinedSliceReducer<
    InitialState,
    Id<DeclaredState & Partial<Lazy>>
  >

  /**
   * Injects a slice (or any `{ reducerPath, reducer }` object, including an
   * RTKQ api) into the combined reducer. Returns the same reducer, typed
   * with the injected slice's state now known to exist.
   *
   * A path already declared (statically or via `withLazyLoadedSlices`) must
   * be injected with a matching state type; a brand-new path may be
   * injected freely and extends the declared state. (Two overloads, same
   * split as 2.x — the conditional in the second makes it unusable for
   * already-declared paths.)
   */
  inject<Sl extends Id<ExistingSliceLike<DeclaredState>>>(
    slice: Sl,
    config?: InjectConfig,
  ): CombinedSliceReducer<InitialState, Id<DeclaredState & WithSlice<Sl>>>

  inject<ReducerPath extends string, State>(
    slice: SliceLike<
      ReducerPath,
      State & (ReducerPath extends keyof DeclaredState ? never : State)
    >,
    config?: InjectConfig,
  ): CombinedSliceReducer<
    InitialState,
    Id<DeclaredState & WithSlice<SliceLike<ReducerPath, State>>>
  >

  /**
   * Wraps a selector so that slice state registered in this combined
   * reducer — but not yet present in the state object — is filled in from
   * the slice's initial state. The selector receives a Proxy; use
   * `selector.original(proxy)` to get the raw state object.
   */
  selector: {
    <Selector extends (state: DeclaredState, ...args: any[]) => unknown>(
      selectorFn: Selector,
    ): (
      state: WithOptionalProp<
        Parameters<Selector>[0],
        Exclude<keyof DeclaredState, keyof InitialState>
      >,
      ...args: Tail<Parameters<Selector>>
    ) => ReturnType<Selector>

    <
      Selector extends (state: DeclaredState, ...args: any[]) => unknown,
      RootState,
    >(
      selectorFn: Selector,
      selectState: (
        rootState: RootState,
        ...args: Tail<Parameters<Selector>>
      ) => WithOptionalProp<
        Parameters<Selector>[0],
        Exclude<keyof DeclaredState, keyof InitialState>
      >,
    ): (
      state: RootState,
      ...args: Tail<Parameters<Selector>>
    ) => ReturnType<Selector>

    /**
     * Returns the unproxied state. Useful for debugging.
     */
    original: (state: DeclaredState) => InitialState & Partial<DeclaredState>
  }
}

type InitialState<Slices extends Array<AnySliceLike | ReducerMap>> =
  UnionToIntersection<
    Slices[number] extends infer Slice
      ? Slice extends AnySliceLike
        ? WithSlice<Slice>
        : StateFromReducersMapObject<Slice>
      : never
  >

const isSliceLike = (
  maybeSliceLike: AnySliceLike | ReducerMap,
): maybeSliceLike is AnySliceLike =>
  'reducerPath' in maybeSliceLike &&
  typeof maybeSliceLike.reducerPath === 'string'

const getReducers = (slices: Array<AnySliceLike | ReducerMap>) =>
  slices.flatMap<[string, Reducer]>((sliceOrMap) =>
    isSliceLike(sliceOrMap)
      ? [[sliceOrMap.reducerPath, sliceOrMap.reducer]]
      : Object.entries(sliceOrMap),
  )

const ORIGINAL_STATE = Symbol.for('rtk-state-proxy-original')

const isStateProxy = (value: any) => !!value && !!value[ORIGINAL_STATE]

/**
 * The canonical missing-slice answer (RTK 3.0): ask the reducer for its
 * initial state directly when it can tell us. Probing with a random action
 * type stays only as a fallback for bare reducers, because running a whole
 * reducer during a selector call executes default cases and type-agnostic
 * matchers, which made 2.x's `combined.selector` disagree with
 * `slice.getInitialState()` for the same slice.
 */
const getReducerInitialState = (reducer: Reducer) =>
  typeof (reducer as Partial<{ getInitialState: () => unknown }>)
    .getInitialState === 'function'
    ? (reducer as unknown as { getInitialState: () => unknown }).getInitialState()
    : reducer(undefined, { type: nanoid() })

const createStateProxy = <State extends object>(
  stateProxyMap: WeakMap<object, object>,
  state: State,
  reducerMap: Partial<Record<PropertyKey, Reducer>>,
  initialStateCache: Record<PropertyKey, unknown>,
) =>
  getOrInsertComputed(
    stateProxyMap,
    state,
    () =>
      new Proxy(state, {
        get: (target, prop, receiver) => {
          if (prop === ORIGINAL_STATE) return target
          const result = Reflect.get(target, prop, receiver)
          if (typeof result === 'undefined') {
            const cached = initialStateCache[prop]
            if (typeof cached !== 'undefined') return cached
            const reducer = reducerMap[prop]
            if (reducer) {
              const reducerResult = getReducerInitialState(reducer)
              if (typeof reducerResult === 'undefined') {
                throw new Error(
                  `The slice reducer for key "${prop.toString()}" returned undefined when asked for its initial state. ` +
                    `The initial state may not be undefined. If you don't want to set a value for this reducer, ` +
                    `you can use null instead of undefined.`,
                )
              }
              initialStateCache[prop] = reducerResult
              return reducerResult
            }
          }
          return result
        },
      }),
  ) as State

const original = (state: any) => {
  if (!isStateProxy(state)) {
    throw new Error('original must be used on state Proxy')
  }
  return state[ORIGINAL_STATE]
}

const emptyObject = {}
const noopReducer: Reducer<Record<string, any>> = (state = emptyObject) => state

export function combineSlices<Slices extends Array<AnySliceLike | ReducerMap>>(
  ...slices: Slices
): CombinedSliceReducer<Id<InitialState<Slices>>> {
  const stateProxyMap = new WeakMap<object, object>()
  const reducerMap = Object.fromEntries(getReducers(slices))

  const getReducer = () =>
    Object.keys(reducerMap).length ? combineReducers(reducerMap) : noopReducer

  let reducer = getReducer()

  function combinedReducer(
    state: Record<string, unknown>,
    action: UnknownAction,
  ) {
    return reducer(state, action)
  }

  combinedReducer.withLazyLoadedSlices = () => combinedReducer

  const initialStateCache: Record<PropertyKey, unknown> = {}

  const inject = (
    slice: AnySliceLike,
    config: InjectConfig = {},
  ): typeof combinedReducer => {
    const { reducerPath, reducer: reducerToInject } = slice

    const currentReducer = reducerMap[reducerPath]
    if (
      !config.overrideExisting &&
      currentReducer &&
      currentReducer !== reducerToInject
    ) {
      console.error(
        `called \`inject\` to override already-existing reducer ${reducerPath} without specifying \`overrideExisting: true\``,
      )
      return combinedReducer
    }

    if (config.overrideExisting && currentReducer !== reducerToInject) {
      delete initialStateCache[reducerPath]
    }

    reducerMap[reducerPath] = reducerToInject

    reducer = getReducer()

    return combinedReducer
  }

  const selector = Object.assign(
    function makeSelector<State extends object, RootState, Args extends any[]>(
      selectorFn: (state: State, ...args: Args) => any,
      selectState?: (rootState: RootState, ...args: Args) => State,
    ) {
      return function selector(state: State, ...args: Args) {
        return selectorFn(
          createStateProxy(
            stateProxyMap,
            selectState ? selectState(state as any, ...args) : state,
            reducerMap,
            initialStateCache,
          ),
          ...args,
        )
      }
    },
    { original },
  )

  return Object.assign(combinedReducer, { inject, selector }) as any
}
