import type {
  CombinedState,
  AnyAction,
  Reducer,
  StateFromReducersMapObject,
} from 'redux'
import { combineReducers } from 'redux'
import { nanoid } from './nanoid'
import type {
  Id,
  NoInfer,
  UnionToIntersection,
  WithOptionalProp,
  WithRequiredProp,
} from './tsHelpers'

type SliceLike<Name extends string, State> = {
  name: Name
  reducer: Reducer<State>
}

type AnySliceLike = SliceLike<string, any>

type SliceLikeState<Sl extends AnySliceLike> = Sl extends SliceLike<
  any,
  infer State
>
  ? State
  : never

type SliceLikeName<Sl extends AnySliceLike> = Sl extends SliceLike<
  infer Name,
  any
>
  ? Name
  : never

export type WithSlice<Sl extends AnySliceLike> = Id<
  {
    [K in SliceLikeName<Sl>]: SliceLikeState<Sl>
  }
>

type ApiLike<ReducerPath extends string, State> = {
  reducerPath: ReducerPath
  reducer: Reducer<State>
}

type AnyApiLike = ApiLike<string, any>

type ApiLikeReducerPath<A extends AnyApiLike> = A extends ApiLike<
  infer ReducerPath,
  any
>
  ? ReducerPath
  : never

type ApiLikeState<A extends AnyApiLike> = A extends ApiLike<any, infer State>
  ? State
  : never

export type WithApi<A extends AnyApiLike> = {
  [Path in ApiLikeReducerPath<A>]: ApiLikeState<A>
}

type ReducerMap = Record<string, Reducer>

// only allow injection of slices we've already declared

type LazyLoadedSliceLike<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]: Name extends string
    ? SliceLike<Name, LazyLoadedState[Name]>
    : never
}[keyof LazyLoadedState]

type LazyLoadedApiLike<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]: Name extends string
    ? ApiLike<Name, LazyLoadedState[Name]>
    : never
}[keyof LazyLoadedState]

type InjectConfig = {
  /**
   * Allow replacing reducer with a different reference. Normally, an error will be thrown if a different reducer instance to the one already injected is used.
   */
  overrideExisting?: boolean
}

type CombinedSliceState<
  InitialState,
  LazyLoadedState extends Record<string, unknown> = {},
  InjectedKeys extends keyof LazyLoadedState = never
> = Id<
  // TODO: use PreloadedState generic instead
  CombinedState<
    InitialState & WithRequiredProp<Partial<LazyLoadedState>, InjectedKeys>
  >
>

/**
 * A reducer that allows for slices/reducers to be injected after initialisation.
 */
interface CombinedSliceReducer<
  InitialState,
  LazyLoadedState extends Record<string, unknown> = {},
  InjectedKeys extends keyof LazyLoadedState = never
> extends Reducer<
    CombinedSliceState<InitialState, LazyLoadedState, InjectedKeys>,
    AnyAction
  > {
  /**
   * Provide a type for slices that will be injected lazily.
   *
   * One way to do this would be with interface merging:
   * ```ts
   *
   * export interface LazyLoadedSlices {}
   *
   * export const rootReducer = combineSlices(stringSlice).withLazyLoadedSlices<LazyLoadedSlices>();
   *
   * // elsewhere
   *
   * declare module './reducer' {
   *   export interface LazyLoadedSlices extends WithSlice<typeof booleanSlice> {}
   * }
   *
   * const withBoolean = rootReducer.inject(booleanSlice);
   *
   * // elsewhere again
   *
   * declare module './reducer' {
   *   export interface LazyLoadedSlices {
   *     customName: CustomState
   *   }
   * }
   *
   * const withCustom = rootReducer.inject({ name: "customName", reducer: customSlice.reducer })
   * ```
   */
  withLazyLoadedSlices<
    Lazy extends Record<string, unknown> = {}
  >(): CombinedSliceReducer<InitialState, LazyLoadedState & Lazy, InjectedKeys>

  /**
   * Inject a slice previously declared with `withLazyLoadedSlices`.
   *
   * Accepts an individual slice, or a { name, reducer } object.
   *
   * ```ts
   * rootReducer.inject(booleanSlice)
   * rootReducer.inject({ name: 'boolean', reducer: newReducer }, { overrideExisting: true })
   * ```
   *
   */
  inject<Sl extends LazyLoadedSliceLike<InitialState & LazyLoadedState>>(
    slice: Sl,
    config?: InjectConfig
  ): CombinedSliceReducer<
    InitialState,
    LazyLoadedState,
    InjectedKeys | SliceLikeName<Sl>
  >

  /**
   * Inject an RTKQ API instance previously declared with `withLazyLoadedSlices`.
   *
   * ```ts
   * rootReducer.inject(baseApi)
   * ```
   *
   */
  inject<A extends LazyLoadedApiLike<InitialState & LazyLoadedState>>(
    slice: A,
    config?: InjectConfig
  ): CombinedSliceReducer<
    InitialState,
    LazyLoadedState,
    InjectedKeys | ApiLikeReducerPath<A>
  >

  /**
   * Create a selector that guarantees that the slices injected will have a defined value when selector is run.
   *
   * ```ts
   * const selectBooleanWithoutInjection = (state: RootState) => state.boolean;
   * //                                                                ^? boolean | undefined
   *
   * const selectBoolean = rootReducer.inject(booleanSlice).selector((state) => {
   *   // if action hasn't been dispatched since slice was injected, this would usually be undefined
   *   // however selector() uses a Proxy around the first parameter to ensure that it evaluates to the initial state instead, if undefined
   *   return state.boolean;
   *   //           ^? boolean
   * })
   * ```
   *
   * If the reducer is nested inside the root state, a selectState callback can be passed to retrieve the reducer's state.
   *
   * ```ts
   *
   * export interface LazyLoadedSlices {};
   *
   * export const innerReducer = combineSlices(stringSlice).withLazyLoadedSlices<LazyLoadedSlices>();
   *
   * export const rootReducer = combineSlices({ inner: innerReducer });
   *
   * export type RootState = ReturnType<typeof rootReducer>;
   *
   * // elsewhere
   *
   * declare module "./reducer.ts" {
   *  export interface LazyLoadedSlices extends WithSlice<typeof booleanSlice> {}
   * }
   *
   * const withBool = innerReducer.inject(booleanSlice);
   *
   * const selectBoolean = withBool.selector(
   *   (state) => state.boolean,
   *   (rootState: RootState) => state.inner
   * );
   * //    now expects to be passed RootState instead of innerReducer state
   *
   * ```
   *
   * Value passed to selectorFn will be a Proxy - use selector.original(proxy) to get original state value (useful for debugging)
   *
   * ```ts
   * const injectedReducer = rootReducer.inject(booleanSlice);
   * const selectBoolean = injectedReducer.selector((state) => {
   *   console.log(injectedReducer.selector.original(state).boolean) // possibly undefined
   *   return state.boolean
   * })
   * ```
   */
  selector: {
    /**
     * Create a selector that guarantees that the slices injected will have a defined value when selector is run.
     *
     * ```ts
     * const selectBooleanWithoutInjection = (state: RootState) => state.boolean;
     * //                                                                ^? boolean | undefined
     *
     * const selectBoolean = rootReducer.inject(booleanSlice).selector((state) => {
     *   // if action hasn't been dispatched since slice was injected, this would usually be undefined
     *   // however selector() uses a Proxy around the first parameter to ensure that it evaluates to the initial state instead, if undefined
     *   return state.boolean;
     *   //           ^? boolean
     * })
     * ```
     *
     * Value passed to selectorFn will be a Proxy - use selector.original(proxy) to get original state value (useful for debugging)
     *
     * ```ts
     * const injectedReducer = rootReducer.inject(booleanSlice);
     * const selectBoolean = injectedReducer.selector((state) => {
     *   console.log(injectedReducer.selector.original(state).boolean) // undefined
     *   return state.boolean
     * })
     * ```
     */
    <
      Selected,
      State extends CombinedSliceState<
        InitialState,
        LazyLoadedState,
        InjectedKeys
      >,
      Args extends any[]
    >(
      selectorFn: (state: State, ...args: Args) => Selected
    ): (state: WithOptionalProp<State, InjectedKeys>, ...args: Args) => Selected

    /**
     * Create a selector that guarantees that the slices injected will have a defined value when selector is run.
     *
     * ```ts
     * const selectBooleanWithoutInjection = (state: RootState) => state.boolean;
     * //                                                                ^? boolean | undefined
     *
     * const selectBoolean = rootReducer.inject(booleanSlice).selector((state) => {
     *   // if action hasn't been dispatched since slice was injected, this would usually be undefined
     *   // however selector() uses a Proxy around the first parameter to ensure that it evaluates to the initial state instead, if undefined
     *   return state.boolean;
     *   //           ^? boolean
     * })
     * ```
     *
     * If the reducer is nested inside the root state, a selectState callback can be passed to retrieve the reducer's state.
     *
     * ```ts
     *
     * interface LazyLoadedSlices {};
     *
     * const innerReducer = combineSlices(stringSlice).withLazyLoadedSlices<LazyLoadedSlices>();
     *
     * const rootReducer = combineSlices({ inner: innerReducer });
     *
     * type RootState = ReturnType<typeof rootReducer>;
     *
     * // elsewhere
     *
     * declare module "./reducer.ts" {
     *  interface LazyLoadedSlices extends WithSlice<typeof booleanSlice> {}
     * }
     *
     * const withBool = innerReducer.inject(booleanSlice);
     *
     * const selectBoolean = withBool.selector(
     *   (state) => state.boolean,
     *   (rootState: RootState) => state.inner
     * );
     * //    now expects to be passed RootState instead of innerReducer state
     *
     * ```
     *
     * Value passed to selectorFn will be a Proxy - use selector.original(proxy) to get original state value (useful for debugging)
     *
     * ```ts
     * const injectedReducer = rootReducer.inject(booleanSlice);
     * const selectBoolean = injectedReducer.selector((state) => {
     *   console.log(injectedReducer.selector.original(state).boolean) // possibly undefined
     *   return state.boolean
     * })
     * ```
     */
    <
      Selected,
      State extends CombinedSliceState<
        InitialState,
        LazyLoadedState,
        InjectedKeys
      >,
      RootState,
      Args extends any[]
    >(
      selectorFn: (state: State, ...args: Args) => Selected,
      selectState: (
        rootState: RootState,
        ...args: NoInfer<Args>
      ) => WithOptionalProp<NoInfer<State>, InjectedKeys>
    ): (state: RootState, ...args: Args) => Selected
    /**
     * Returns the unproxied state. Useful for debugging.
     * @param state state Proxy, that ensures injected reducers have value
     * @returns original, unproxied state
     * @throws if value passed is not a state Proxy
     */
    original: <
      State extends CombinedSliceState<
        InitialState,
        LazyLoadedState,
        InjectedKeys
      >
    >(
      state: State
    ) => WithOptionalProp<State, InjectedKeys>
  }
}

type InitialState<
  Slices extends Array<AnySliceLike | AnyApiLike | ReducerMap>
> = UnionToIntersection<
  Slices[number] extends infer Slice
    ? Slice extends AnySliceLike
      ? WithSlice<Slice>
      : Slice extends AnyApiLike
      ? WithApi<Slice>
      : StateFromReducersMapObject<Slice>
    : never
>

const isSliceLike = (
  maybeSliceLike: AnySliceLike | AnyApiLike | ReducerMap
): maybeSliceLike is AnySliceLike =>
  'name' in maybeSliceLike && typeof maybeSliceLike.name === 'string'

const isApiLike = (
  maybeApiLike: AnySliceLike | AnyApiLike | ReducerMap
): maybeApiLike is AnyApiLike =>
  'reducerPath' in maybeApiLike && typeof maybeApiLike.reducerPath === 'string'

const getReducers = (slices: Array<AnySliceLike | AnyApiLike | ReducerMap>) =>
  slices.flatMap((sliceOrMap) =>
    isSliceLike(sliceOrMap)
      ? [[sliceOrMap.name, sliceOrMap.reducer] as const]
      : isApiLike(sliceOrMap)
      ? [[sliceOrMap.reducerPath, sliceOrMap.reducer] as const]
      : Object.entries(sliceOrMap)
  )

const ORIGINAL_STATE = Symbol.for('rtk-state-proxy-original')

const isStateProxy = (value: any) => !!value && !!value[ORIGINAL_STATE]

const stateProxyMap = new WeakMap<object, object>()

const createStateProxy = <State extends object>(
  state: State,
  reducerMap: Partial<Record<string, Reducer>>
) => {
  let proxy = stateProxyMap.get(state)
  if (!proxy) {
    proxy = new Proxy(state, {
      get: (target, prop, receiver) => {
        if (prop === ORIGINAL_STATE) return target
        const result = Reflect.get(target, prop, receiver)
        if (typeof result === 'undefined') {
          const reducer = reducerMap[prop.toString()]
          if (reducer) {
            // ensure action type is random, to prevent reducer treating it differently
            const reducerResult = reducer(undefined, { type: nanoid() })
            if (typeof reducerResult === 'undefined') {
              throw new Error(
                `The slice reducer for key "${prop.toString()}" returned undefined when called for selector(). ` +
                  `If the state passed to the reducer is undefined, you must ` +
                  `explicitly return the initial state. The initial state may ` +
                  `not be undefined. If you don't want to set a value for this reducer, ` +
                  `you can use null instead of undefined.`
              )
            }
            return reducerResult
          }
        }
        return result
      },
    })
    stateProxyMap.set(state, proxy)
  }
  return proxy as State
}

const original = (state: any) => {
  if (!isStateProxy(state)) {
    throw new Error('original must be used on state Proxy')
  }
  return state[ORIGINAL_STATE]
}

export function combineSlices<
  Slices extends Array<AnySliceLike | AnyApiLike | ReducerMap>
>(...slices: Slices): CombinedSliceReducer<Id<InitialState<Slices>>> {
  const reducerMap = Object.fromEntries<Reducer>(getReducers(slices))

  const getReducer = () => combineReducers(reducerMap)

  let reducer = getReducer()

  function combinedReducer(state: Record<string, unknown>, action: AnyAction) {
    return reducer(state, action)
  }

  combinedReducer.withLazyLoadedSlices = () => combinedReducer

  const inject = (
    slice: AnySliceLike | AnyApiLike,
    config: InjectConfig = {}
  ): typeof combinedReducer => {
    if (isApiLike(slice)) {
      return inject(
        {
          name: slice.reducerPath,
          reducer: slice.reducer,
        },
        config
      )
    }

    const { name, reducer: reducerToInject } = slice

    if (process.env.NODE_ENV !== 'production' && !config.overrideExisting) {
      const currentReducer = reducerMap[name]
      if (currentReducer && currentReducer !== reducerToInject) {
        throw new Error(
          `Name '${name}' has already been injected with different reducer instance`
        )
      }
    }

    reducerMap[name] = reducerToInject

    reducer = getReducer()

    return combinedReducer
  }

  const selector = Object.assign(
    function makeSelector<State extends object, RootState, Args extends any[]>(
      selectorFn: (state: State, ...args: Args) => any,
      selectState?: (rootState: RootState, ...args: Args) => State
    ) {
      return function selector(state: State, ...args: Args) {
        return selectorFn(
          createStateProxy(
            selectState ? selectState(state as any, ...args) : state,
            reducerMap
          ),
          ...args
        )
      }
    },
    { original }
  )

  return Object.assign(combinedReducer, { inject, selector }) as any
}
