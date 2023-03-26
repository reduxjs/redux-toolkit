import type { CombinedState, AnyAction, Reducer } from 'redux'
import type { Slice } from './createSlice'
import { configureStore } from './configureStore'
import type {
  Id,
  UnionToIntersection,
  WithOptionalProp,
  WithRequiredProp,
} from './tsHelpers'
import { createSelector } from 'reselect'

type AnySlice = Slice<any, any, any>

type SliceState<Sl extends AnySlice> = Sl extends Slice<infer State, any, any>
  ? State
  : never

type SliceName<Sl extends AnySlice> = Sl extends Slice<any, any, infer Name>
  ? Name
  : never

export type WithSlice<Sl extends AnySlice> = Id<
  // distribute
  Sl extends AnySlice
    ? {
        [K in SliceName<Sl>]: SliceState<Sl>
      }
    : never
>

// only allow injection of slices we've already declared
type LazyLoadedSlice<LazyLoadedState extends Record<string, unknown>> = {
  [Name in keyof LazyLoadedState]: Name extends string
    ? Slice<LazyLoadedState[Name], any, Name>
    : never
}[keyof LazyLoadedState]

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
      LazyLoadedSlice<LazyLoadedState>,
      ...LazyLoadedSlice<LazyLoadedState>[]
    ]
  >(
    ...slices: Slices
  ): CombinedSliceReducer<
    StaticState,
    LazyLoadedState,
    InjectedKeys | SliceName<Slices[number]>
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

// TODO: support arbitrary { key: reducer } objects
declare const combineSlices: <Slices extends [AnySlice, ...AnySlice[]]>(
  ...slices: Slices
) => CombinedSliceReducer<Id<UnionToIntersection<WithSlice<Slices[number]>>>>

// test it works

declare const fooSlice: Slice<'foo', {}, 'foo'>

declare const barSlice: Slice<'bar', {}, 'bar'>

declare const bazSlice: Slice<'baz', {}, 'baz'>

const baseReducer = combineSlices(fooSlice, barSlice).withLazyLoadedSlices<{
  [bazSlice.name]: ReturnType<typeof bazSlice.reducer>
}>()

const store = configureStore({
  reducer: baseReducer,
})

type RootState = ReturnType<typeof store.getState>

const withoutInjection = baseReducer.selector((state) => state.bar)

const selector1 = withoutInjection(store.getState())
//    ^?

const withInjection = baseReducer
  .injectSlices(bazSlice)
  .selector((state) => state.bar)

const selector2 = withInjection(store.getState())
//    ^?

const memoized = baseReducer.injectSlices(bazSlice).selector(
  createSelector(
    // can't be inferred
    (state: RootState & WithSlice<typeof bazSlice>) => state.baz,
    (_: unknown, id: string) => id,
    (state, id) => `${state.length}${id}` as const
  )
)

const selector3 = memoized(store.getState(), 'id')
//    ^?
