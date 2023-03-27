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

type AnySlice = Slice<any, any, any>

type ReducerMap = Record<string, Reducer>

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

// only allow injection of slices we've already declared
type LazyLoadedSlice<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]: Name extends string
    ? Slice<LazyLoadedState[Name], any, Name>
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

// Prevent undeclared keys in reducer maps and slices
type ValidateReducerMaps<
  LazyLoadedState extends Record<string, unknown>,
  Slices extends [
    LazyLoadedSlice<LazyLoadedState> | LazyLoadedReducerMap<LazyLoadedState>,
    ...Array<
      LazyLoadedSlice<LazyLoadedState> | LazyLoadedReducerMap<LazyLoadedState>
    >
  ]
> = Slices &
  {
    [Index in keyof Slices]: Slices[Index] extends AnySlice
      ? SliceName<Slices[Index]> extends keyof LazyLoadedState
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
    LazyLoadedSlice<LazyLoadedState> | LazyLoadedReducerMap<LazyLoadedState>,
    ...Array<
      LazyLoadedSlice<LazyLoadedState> | LazyLoadedReducerMap<LazyLoadedState>
    >
  ]
> = Slices[number] extends infer Slice
  ? Slice extends AnySlice
    ? SliceName<Slice>
    : keyof Slice
  : never

interface CombinedSliceReducer<
  StaticState,
  LazyLoadedState extends Record<string, unknown> = {},
  InjectedKeys extends keyof LazyLoadedState = never
> extends Reducer<
    CombinedSliceState<StaticState, LazyLoadedState, InjectedKeys>,
    AnyAction
  > {
  withLazyLoadedSlices<
    Lazy extends Record<string, unknown> = {}
  >(): CombinedSliceReducer<StaticState, LazyLoadedState & Lazy, InjectedKeys>

  injectSlices<
    Slices extends [
      LazyLoadedSlice<LazyLoadedState> | LazyLoadedReducerMap<LazyLoadedState>,
      ...Array<
        LazyLoadedSlice<LazyLoadedState> | LazyLoadedReducerMap<LazyLoadedState>
      >
    ]
  >(
    ...slices: ValidateReducerMaps<LazyLoadedState, Slices>
  ): CombinedSliceReducer<
    StaticState,
    LazyLoadedState,
    InjectedKeys | NewKeys<LazyLoadedState, Slices>
  >

  selector: {
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

type StaticState<
  Slices extends [AnySlice | ReducerMap, ...Array<AnySlice | ReducerMap>]
> = UnionToIntersection<
  Slices[number] extends infer Slice
    ? Slice extends AnySlice
      ? WithSlice<Slice>
      : StateFromReducersMapObject<Slice>
    : never
>

const isSlice = (maybeSlice: AnySlice | ReducerMap): maybeSlice is AnySlice =>
  typeof maybeSlice.actions === 'object'

const getReducers = (slices: Array<AnySlice | ReducerMap>) =>
  slices.flatMap((sliceOrMap) =>
    isSlice(sliceOrMap)
      ? [[sliceOrMap.name, sliceOrMap.reducer] as const]
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
  Slices extends [AnySlice | ReducerMap, ...Array<AnySlice | ReducerMap>]
>(...slices: Slices): CombinedSliceReducer<Id<StaticState<Slices>>> {
  const reducerMap = Object.fromEntries<Reducer>(getReducers(slices))

  const getReducer = () => combineReducers(reducerMap)

  let reducer = getReducer()

  function combinedReducer(state: Record<string, unknown>, action: AnyAction) {
    return reducer(state, action)
  }

  combinedReducer.withLazyLoadedSlices = () => combinedReducer

  combinedReducer.injectSlices = (...slices: Array<AnySlice | ReducerMap>) => {
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

  // @ts-ignore
  combinedReducer.selector.original = (state: any) => {
    if (!isStateProxy(state)) {
      throw new Error('original must be used on state Proxy')
    }
    return state[ORIGINAL_STATE]
  }

  return combinedReducer as any
}
