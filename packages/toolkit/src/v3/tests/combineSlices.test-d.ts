import type { Reducer } from 'redux'
import { combineSlices } from '../combineSlices'
import type { WithSlice } from '../combineSlices'
import { createSlice } from '../index'

interface CounterState {
  value: number
}

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    increment(state) {
      state.value++
    },
  },
  selectors: {
    selectValue: (state) => state.value,
    selectPlus: (state, amount: number) => state.value + amount,
  },
})

const stringSlice = createSlice({
  name: 'string',
  initialState: 'hello',
  reducers: {},
})

const plainReducer: Reducer<number> = (state = 0) => state

describe('combineSlices v3 types', () => {
  test('static slices and reducer maps produce the combined state shape', () => {
    const combined = combineSlices(stringSlice, { plain: plainReducer })
    const state = combined(undefined, { type: 'unknown' })

    expectTypeOf(state.string).toEqualTypeOf<string>()
    expectTypeOf(state.plain).toEqualTypeOf<number>()
  })

  test('withLazyLoadedSlices declares optional state; inject makes it required', () => {
    const combined = combineSlices(stringSlice).withLazyLoadedSlices<
      WithSlice<typeof counterSlice>
    >()

    expectTypeOf(
      combined(undefined, { type: 'unknown' }).counter,
    ).toEqualTypeOf<CounterState | undefined>()

    const injected = combined.inject(counterSlice)
    expectTypeOf(
      injected(undefined, { type: 'unknown' }).counter,
    ).toEqualTypeOf<CounterState>()

    // A brand-new path may be injected freely and extends the state type.
    const undeclaredSlice = createSlice({
      name: 'undeclared',
      initialState: 0,
      reducers: {},
    })
    const withUndeclared = combined.inject(undeclaredSlice)
    expectTypeOf(
      withUndeclared(undefined, { type: 'unknown' }).undeclared,
    ).toEqualTypeOf<number>()

    // But a declared path must be injected with a matching state type.
    const wrongStateSlice = createSlice({
      name: 'counter',
      initialState: 'not a counter',
      reducers: {},
    })
    // @ts-expect-error declared path with mismatched state type
    combined.inject(wrongStateSlice)
  })

  test('after inject, selectors see the slice state as present while callers may omit it', () => {
    const combined = combineSlices(stringSlice).withLazyLoadedSlices<
      WithSlice<typeof counterSlice>
    >()

    // Before inject, the lazily declared key is optional inside selectors too.
    combined.selector((state) => {
      expectTypeOf(state.counter).toEqualTypeOf<CounterState | undefined>()
    })

    const injected = combined.inject(counterSlice)

    const selectValue = injected.selector((state) => {
      // Inside the selector, the proxy guarantees the value exists.
      expectTypeOf(state.counter).toEqualTypeOf<CounterState>()
      return state.counter.value
    })

    // Callers may pass state without the lazily declared key.
    expectTypeOf(selectValue({ string: 'hello' })).toEqualTypeOf<number>()

    const selectWithRoot = injected.selector(
      (state) => state.counter.value,
      (rootState: { inner: { string: string; counter?: CounterState } }) =>
        rootState.inner,
    )
    expectTypeOf(selectWithRoot).parameter(0).toEqualTypeOf<{
      inner: { string: string; counter?: CounterState }
    }>()
  })
})

describe('injectInto types', () => {
  const combined = combineSlices(stringSlice).withLazyLoadedSlices<
    WithSlice<typeof counterSlice> & { aka: CounterState }
  >()

  test('uninjected slice selectors require the slice state key', () => {
    expectTypeOf(counterSlice.selectSlice)
      .parameter(0)
      .toEqualTypeOf<{ counter: CounterState }>()

    // @ts-expect-error missing counter key
    counterSlice.selectSlice({})

    // @ts-expect-error missing counter key
    counterSlice.selectors.selectValue({})
  })

  test('injected slice selectors accept state without the slice key', () => {
    const injected = counterSlice.injectInto(combined)

    expectTypeOf(injected.selectSlice({})).toEqualTypeOf<CounterState>()
    expectTypeOf(injected.selectors.selectValue({})).toEqualTypeOf<number>()
    expectTypeOf(
      injected.selectors.selectPlus({ counter: { value: 1 } }, 2),
    ).toEqualTypeOf<number>()
    expectTypeOf(injected.selectors.selectValue.unwrapped).toEqualTypeOf<
      (state: CounterState) => number
    >()

    // Everything else keeps the original slice's types.
    expectTypeOf(injected.actions).toEqualTypeOf(counterSlice.actions)
    expectTypeOf(injected.getInitialState()).toEqualTypeOf<CounterState>()
  })

  test('reducerPath override changes the expected state key', () => {
    const renamed = counterSlice.injectInto(combined, { reducerPath: 'aka' })

    expectTypeOf(renamed.reducerPath).toEqualTypeOf<'aka'>()
    expectTypeOf(renamed.selectSlice({ aka: { value: 1 } })).toEqualTypeOf<CounterState>()
    expectTypeOf(renamed.selectSlice({})).toEqualTypeOf<CounterState>()

    // @ts-expect-error the old path is no longer part of the expected shape
    renamed.selectSlice({ counter: { value: 1 } })
  })
})
