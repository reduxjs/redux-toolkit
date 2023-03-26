import type {
  CombinedState,
  AnyAction,
  Reducer,
  StateFromReducersMapObject,
} from 'redux'
import { combineReducers } from 'redux'
import type { Slice } from './createSlice'
import { configureStore } from './configureStore'
import type {
  Id,
  UnionToIntersection,
  WithOptionalProp,
  WithRequiredProp,
} from './tsHelpers'
import { safeAssign } from './tsHelpers'
import { createSelector } from 'reselect'

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

// Prevent undeclared keys in reducer maps
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
      ? {}
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
    Lazy extends Record<string, unknown>
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

  // TODO: deal with nested state?
  selector<
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

export function combineSlices<
  Slices extends [AnySlice | ReducerMap, ...Array<AnySlice | ReducerMap>]
>(...slices: Slices): CombinedSliceReducer<Id<StaticState<Slices>>> {
  const reducerMap = slices.reduce<Record<string, Reducer>>((map, slice) => {
    if (isSlice(slice)) {
      map[slice.name] = slice.reducer
    } else {
      safeAssign(map, slice)
    }
    return map
  }, {})

  const getReducer = () => combineReducers(reducerMap)

  let reducer = getReducer()

  function combinedReducer(state: Record<string, unknown>, action: AnyAction) {
    return reducer(state, action)
  }

  combinedReducer.withLazyLoadedSlices = () => combinedReducer

  combinedReducer.injectSlices = (...slices: Array<AnySlice | ReducerMap>) => {
    slices.forEach((slice) => {
      if (isSlice(slice)) {
        reducerMap[slice.name] = slice.reducer
      } else {
        safeAssign(reducerMap, slice)
      }
    })
    reducer = getReducer()
  }

  combinedReducer.selector =
    <State, Args extends any[]>(
      selectorFn: (state: State, ...args: Args) => any
    ) =>
    (state: State, ...args: Args) =>
      // TODO: ensure injected reducers have state
      selectorFn(state, ...args)

  return combinedReducer as any
}

// test it works

declare const fooSlice: Slice<'foo', {}, 'foo'>

declare const barReducer: Reducer<'bar'>

declare const bazSlice: Slice<'baz', {}, 'baz'>

const baseReducer = combineSlices(fooSlice, {
  bar2: barReducer,
})
  .withLazyLoadedSlices<WithSlice<typeof bazSlice>>()
  .withLazyLoadedSlices<{
    bar2: ReturnType<typeof barReducer>
  }>()

const store = configureStore({
  reducer: baseReducer,
})

type RootState = ReturnType<typeof store.getState>

const withoutInjection = baseReducer.selector((state) => state.baz)

const selector1 = withoutInjection(store.getState())
//    ^?

const withInjection = baseReducer
  .injectSlices(bazSlice, {
    bar2: barReducer,
  })
  .selector((state) => state.baz)

// @ts-expect-error unexpected key
baseReducer.injectSlices({
  bar2: barReducer,
  bar3: barReducer,
})

const selector2 = withInjection(store.getState())
//    ^?

const memoizedWithoutInjection = baseReducer.selector(
  createSelector(
    // can't be inferred
    (state: RootState & WithSlice<typeof bazSlice>) => state.baz,
    (_: unknown, id: string) => id,
    (state, id) => `${state?.length}${id}` as const
  )
)

// @ts-expect-error doesn't guarantee injection, so errors
const selector3 = memoizedWithoutInjection(store.getState(), 'id')
//    ^?

const memoizedWithInjection = baseReducer.injectSlices(bazSlice).selector(
  createSelector(
    // can't be inferred
    (state: RootState & WithSlice<typeof bazSlice>) => state.baz,
    (_: unknown, id: string) => id,
    (state, id) => `${state.length}${id}` as const
  )
)

const selector4 = memoizedWithInjection(store.getState(), 'id')
//    ^?
