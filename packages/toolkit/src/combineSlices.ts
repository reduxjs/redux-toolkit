import type {
  CombinedState,
  AnyAction,
  Reducer,
  StateFromReducersMapObject,
} from 'redux'
import { combineReducers } from 'redux'
import type { Slice } from './createSlice'
import { nanoid } from './nanoid'
import type {
  Id,
  NoInfer,
  UnionToIntersection,
  WithOptionalProp,
  WithRequiredProp,
} from './tsHelpers'

type AnySlice = Slice<any, any, string>

type SliceState<Sl extends AnySlice> = Sl extends Slice<infer State, any, any>
  ? State
  : never

type SliceName<Sl extends AnySlice> = Sl extends Slice<any, any, infer Name>
  ? Name
  : never

export type WithSlice<Sl extends AnySlice> = Id<
  {
    [K in SliceName<Sl>]: SliceState<Sl>
  }
>

type Api<ReducerPath extends string, State> = {
  reducerPath: ReducerPath
  reducer: Reducer<State>
}

type AnyApi = Api<string, any>

type ApiReducerPath<A extends AnyApi> = A extends Api<infer ReducerPath, any>
  ? ReducerPath
  : never

type ApiState<A extends AnyApi> = A extends Api<any, infer State>
  ? State
  : never

export type WithApi<A extends AnyApi> = {
  [Path in ApiReducerPath<A>]: ApiState<A>
}

type ReducerMap = Record<string, Reducer>

// only allow injection of slices we've already declared

type LazyLoadedSlice<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]: Name extends string
    ? Slice<LazyLoadedState[Name], any, Name>
    : never
}[keyof LazyLoadedState]

type LazyLoadedApi<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]: Name extends string
    ? Api<Name, LazyLoadedState[Name]>
    : never
}[keyof LazyLoadedState]

type LazyLoadedReducerMap<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]?: Reducer<LazyLoadedState[Name]>
}

type CombinedSliceState<
  StaticState,
  LazyLoadedState extends Record<string, unknown> = {},
  InjectedKeys extends keyof LazyLoadedState = never
> = Id<
  // TODO: use PreloadedState generic instead
  CombinedState<
    StaticState & WithRequiredProp<Partial<LazyLoadedState>, InjectedKeys>
  >
>

// Prevent undeclared keys in reducer maps, apis and slices
type ValidateReducerMaps<
  LazyLoadedState extends Record<string, unknown>,
  Slices extends [
    (
      | LazyLoadedSlice<LazyLoadedState>
      | LazyLoadedApi<LazyLoadedState>
      | LazyLoadedReducerMap<LazyLoadedState>
    ),
    ...Array<
      | LazyLoadedSlice<LazyLoadedState>
      | LazyLoadedApi<LazyLoadedState>
      | LazyLoadedReducerMap<LazyLoadedState>
    >
  ]
> = Slices &
  {
    [Index in keyof Slices]: Slices[Index] extends AnySlice
      ? SliceName<Slices[Index]> extends keyof LazyLoadedState
        ? {}
        : never
      : Slices[Index] extends AnyApi
      ? ApiReducerPath<Slices[Index]> extends keyof LazyLoadedState
        ? {}
        : never
      : {
          [Name in keyof Slices[Index]]: Name extends keyof LazyLoadedState
            ? Reducer
            : never
        }
  }

type NewKeys<
  LazyLoadedState extends Record<string, unknown>,
  Slices extends [
    (
      | LazyLoadedSlice<LazyLoadedState>
      | LazyLoadedApi<LazyLoadedState>
      | LazyLoadedReducerMap<LazyLoadedState>
    ),
    ...Array<
      | LazyLoadedSlice<LazyLoadedState>
      | LazyLoadedApi<LazyLoadedState>
      | LazyLoadedReducerMap<LazyLoadedState>
    >
  ]
> = Slices[number] extends infer Slice
  ? Slice extends AnySlice
    ? SliceName<Slice>
    : Slice extends AnyApi
    ? ApiReducerPath<Slice>
    : keyof Slice
  : never

/**
 * A reducer that allows for slices/reducers to be injected after initialisation.
 */
interface CombinedSliceReducer<
  StaticState,
  LazyLoadedState extends Record<string, unknown> = {},
  InjectedKeys extends keyof LazyLoadedState = never
> extends Reducer<
    CombinedSliceState<StaticState, LazyLoadedState, InjectedKeys>,
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
   * const withBoolean = rootReducer.injectSlices(booleanSlice);
   *
   * // elsewhere again
   *
   * declare module './reducer' {
   *   export interface LazyLoadedSlices {
   *     customName: CustomState
   *   }
   * }
   *
   * const withCustom = rootReducer.injectSlices({ customName: customSlice.reducer })
   * ```
   */
  withLazyLoadedSlices<
    Lazy extends Record<string, unknown> = {}
  >(): CombinedSliceReducer<StaticState, LazyLoadedState & Lazy, InjectedKeys>
  /**
   * Inject slices/reducers previously declared with `withLazyLoadedSlices`.
   *
   * Accepts same parameters as `combineSlices` - each can be an individual slice, an RTKQ api instance, or an object mapping from key to reducer.
   *
   * ```ts
   * rootReducer.injectSlices(booleanSlice, baseApi, { custom: customSlice.reducer })
   * ```
   *
   */
  injectSlices<
    Slices extends [
      (
        | LazyLoadedSlice<LazyLoadedState>
        | LazyLoadedApi<LazyLoadedState>
        | LazyLoadedReducerMap<LazyLoadedState>
      ),
      ...Array<
        | LazyLoadedSlice<LazyLoadedState>
        | LazyLoadedApi<LazyLoadedState>
        | LazyLoadedReducerMap<LazyLoadedState>
      >
    ]
  >(
    ...slices: ValidateReducerMaps<LazyLoadedState, Slices>
  ): CombinedSliceReducer<
    StaticState,
    LazyLoadedState,
    InjectedKeys | NewKeys<LazyLoadedState, Slices>
  >

  /**
   * Create a selector that guarantees that the slices injected will have a defined value when selector is run.
   *
   * ```ts
   * const selectBooleanWithoutInjection = (state: RootState) => state.boolean;
   * //                                                                ^? boolean | undefined
   *
   * const selectBoolean = rootReducer.injectSlices(booleanSlice).selector((state) => {
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
   * const withBool = innerReducer.injectSlices(booleanSlice);
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
   * const injectedReducer = rootReducer.injectSlices(booleanSlice);
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
     * const selectBoolean = rootReducer.injectSlices(booleanSlice).selector((state) => {
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
     * const injectedReducer = rootReducer.injectSlices(booleanSlice);
     * const selectBoolean = injectedReducer.selector((state) => {
     *   console.log(injectedReducer.selector.original(state).boolean) // undefined
     *   return state.boolean
     * })
     * ```
     */
    <
      Selected,
      State extends CombinedSliceState<
        StaticState,
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
     * const selectBoolean = rootReducer.injectSlices(booleanSlice).selector((state) => {
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
     * const withBool = innerReducer.injectSlices(booleanSlice);
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
     * const injectedReducer = rootReducer.injectSlices(booleanSlice);
     * const selectBoolean = injectedReducer.selector((state) => {
     *   console.log(injectedReducer.selector.original(state).boolean) // possibly undefined
     *   return state.boolean
     * })
     * ```
     */
    <
      Selected,
      State extends CombinedSliceState<
        StaticState,
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
        StaticState,
        LazyLoadedState,
        InjectedKeys
      >
    >(
      state: State
    ) => WithOptionalProp<State, InjectedKeys>
  }
}

type StaticState<Slices extends Array<AnySlice | AnyApi | ReducerMap>> =
  UnionToIntersection<
    Slices[number] extends infer Slice
      ? Slice extends AnySlice
        ? WithSlice<Slice>
        : Slice extends AnyApi
        ? WithApi<Slice>
        : StateFromReducersMapObject<Slice>
      : never
  >

const isSlice = (
  maybeSlice: AnySlice | AnyApi | ReducerMap
): maybeSlice is AnySlice =>
  'actions' in maybeSlice && typeof maybeSlice.actions === 'object'

const isApi = (maybeApi: AnySlice | AnyApi | ReducerMap): maybeApi is AnyApi =>
  'reducerPath' in maybeApi && typeof maybeApi.reducerPath === 'string'

const getReducers = (slices: Array<AnySlice | AnyApi | ReducerMap>) =>
  slices.flatMap((sliceOrMap) =>
    isSlice(sliceOrMap)
      ? [[sliceOrMap.name, sliceOrMap.reducer] as const]
      : isApi(sliceOrMap)
      ? [[sliceOrMap.reducerPath, sliceOrMap.reducer] as const]
      : Object.entries(sliceOrMap)
  )

const ORIGINAL_STATE = Symbol()

const isStateProxy = (value: any) => !!value && !!value[ORIGINAL_STATE]

const createStateProxy = <State extends object>(
  state: State,
  reducerMap: Partial<Record<string, Reducer>>
) =>
  new Proxy(state, {
    get: (target, prop, receiver) => {
      if (prop === ORIGINAL_STATE) return target
      const result = Reflect.get(target, prop, receiver)
      if (typeof result === 'undefined') {
        const reducer = reducerMap[prop.toString()]
        if (reducer) {
          // ensure action type is random, to prevent reducer treating it differently
          return reducer(undefined, { type: nanoid() })
        }
      }
      return result
    },
  })

export function combineSlices<
  Slices extends Array<AnySlice | AnyApi | ReducerMap>
>(...slices: Slices): CombinedSliceReducer<Id<StaticState<Slices>>> {
  const reducerMap = Object.fromEntries<Reducer>(getReducers(slices))

  const getReducer = () => combineReducers(reducerMap)

  let reducer = getReducer()

  function combinedReducer(state: Record<string, unknown>, action: AnyAction) {
    return reducer(state, action)
  }

  combinedReducer.withLazyLoadedSlices = () => combinedReducer

  combinedReducer.injectSlices = (
    ...slices: Array<AnySlice | AnyApi | ReducerMap>
  ) => {
    for (const [name, newReducer] of getReducers(slices)) {
      if (process.env.NODE_ENV !== 'production') {
        const currentReducer = reducerMap[name]
        if (currentReducer && currentReducer !== newReducer) {
          throw new Error(
            `Name '${name}' has already been injected with different reducer instance`
          )
        }
      }
      reducerMap[name] = newReducer
    }
    reducer = getReducer()

    return combinedReducer
  }

  combinedReducer.selector =
    <State extends object, RootState, Args extends any[]>(
      selectorFn: (state: State, ...args: Args) => any,
      selectState?: (rootState: RootState, ...args: Args) => State
    ) =>
    (state: State, ...args: Args) =>
      selectorFn(
        createStateProxy(
          selectState ? selectState(state as any, ...args) : state,
          reducerMap
        ),
        ...args
      )
  ;(combinedReducer.selector as CombinedSliceReducer<{}>['selector']).original =
    (state: any) => {
      if (!isStateProxy(state)) {
        throw new Error('original must be used on state Proxy')
      }
      return state[ORIGINAL_STATE]
    }

  return combinedReducer as any
}
