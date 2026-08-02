import type { Reducer, UnknownAction } from 'redux'
import { combineSlices as combineSlices2x } from '../../combineSlices'
import { configureStore } from '../../configureStore'
import { combineSlices } from '../combineSlices'
import type { WithSlice } from '../combineSlices'
import { createSlice } from '../createSlice'

interface CounterState {
  value: number
}

const makeCounterSlice = () =>
  createSlice({
    name: 'counter',
    initialState: { value: 0 } as CounterState,
    reducers: {
      increment(state) {
        state.value++
      },
    },
    selectors: {
      selectValue: (state) => state.value,
    },
  })

/**
 * A slice whose respondTo registers a stateful default case: the E1 probe
 * detector. Running the reducer with any unknown action (including the
 * 2.x nanoid probe and the store's @@INIT) sets sawUnknown to true;
 * getInitialState() leaves it false.
 */
const makeAuditSlice = () =>
  createSlice({
    name: 'audit',
    initialState: { sawUnknown: false },
    reducers: {},
    respondTo: (builder) => {
      builder.addDefaultCase((state) => {
        state.sawUnknown = true
      })
    },
  })

describe('combineSlices v3', () => {
  it('combines static slices and reducer maps, and routes actions', () => {
    const counterSlice = makeCounterSlice()
    const plainReducer: Reducer<string> = (state = 'plain') => state
    const combined = combineSlices(counterSlice, { plain: plainReducer })
    const store = configureStore({ reducer: combined })

    expect(store.getState()).toEqual({ counter: { value: 0 }, plain: 'plain' })
    store.dispatch(counterSlice.actions.increment())
    expect(store.getState().counter.value).toBe(1)
  })

  it('selector fills in not-yet-materialized slice state from getInitialState, not by probing (E1)', () => {
    const counterSlice = makeCounterSlice()
    const auditSlice = makeAuditSlice()
    const combined = combineSlices(counterSlice).withLazyLoadedSlices<
      WithSlice<typeof auditSlice>
    >()
    const store = configureStore({ reducer: combined })

    const injected = auditSlice.injectInto(combined)
    // No dispatch since injection: the store state has no `audit` key yet.
    const preInjectionState = store.getState()
    expect('audit' in preInjectionState).toBe(false)

    const selectAudit = combined.selector((state) => state.audit)
    const filledIn = selectAudit(preInjectionState)

    // The 2.x probe would run the reducer with a random action type,
    // executing the default case and returning { sawUnknown: true }.
    expect(filledIn).toEqual({ sawUnknown: false })

    // All three mechanisms agree now (they diverge in 2.x):
    expect(filledIn).toEqual(auditSlice.getInitialState())
    expect(filledIn).toEqual(injected.selectSlice({}))

    // The filled-in value is cached with stable identity.
    expect(selectAudit(preInjectionState)).toBe(filledIn)

    // After a dispatch the real store state takes over — and *that* state
    // has seen the unknown action, because the default case ran for real.
    store.dispatch({ type: 'unrelated' })
    expect(selectAudit(store.getState())).toEqual({ sawUnknown: true })
    expect(store.getState().audit).toEqual({ sawUnknown: true })
  })

  it('falls back to probing for bare reducers without getInitialState', () => {
    const bareReducer: Reducer<{ n: number }> = (state = { n: 5 }) => state
    const combined = combineSlices().withLazyLoadedSlices<{
      bare: { n: number }
    }>()
    combined.inject({ reducerPath: 'bare', reducer: bareReducer })

    expect(combined.selector((state) => state.bare)({})).toEqual({ n: 5 })
  })

  it('throws if a bare reducer returns undefined for its initial state', () => {
    const badReducer = ((state: unknown) => state) as Reducer<unknown>
    const combined = combineSlices().withLazyLoadedSlices<{ bad: unknown }>()
    combined.inject({ reducerPath: 'bad', reducer: badReducer })

    expect(() =>
      combined.selector((state) => state.bad)({}),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: The slice reducer for key "bad" returned undefined when asked for its initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.]`,
    )
  })

  it('leaves state keys without a registered reducer as undefined', () => {
    const combined = combineSlices().withLazyLoadedSlices<{
      nothing?: string
    }>()
    expect(combined.selector((state) => state.nothing)({})).toBeUndefined()
  })

  it('handles inject conflicts: no-op for same identity, logs and skips for different identity, replaces with overrideExisting', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const first: Reducer<{ v: number }> = (state = { v: 1 }) => state
      const second: Reducer<{ v: number }> = (state = { v: 2 }) => state
      const combined = combineSlices().withLazyLoadedSlices<{
        x: { v: number }
      }>()
      const selectX = combined.selector((state) => state.x)

      combined.inject({ reducerPath: 'x', reducer: first })
      expect(selectX({})).toEqual({ v: 1 })

      // Same identity: silent no-op.
      combined.inject({ reducerPath: 'x', reducer: first })
      expect(consoleSpy).not.toHaveBeenCalled()

      // Different identity without overrideExisting: logs, keeps first.
      combined.inject({ reducerPath: 'x', reducer: second })
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(selectX({})).toEqual({ v: 1 })

      // overrideExisting replaces the reducer and invalidates the
      // initial-state cache.
      combined.inject(
        { reducerPath: 'x', reducer: second },
        { overrideExisting: true },
      )
      expect(selectX({})).toEqual({ v: 2 })
    } finally {
      consoleSpy.mockRestore()
    }
  })
})

describe('slice.injectInto', () => {
  it('uninjected selectors throw on missing state; injected selectors fall back with stable identity', () => {
    const counterSlice = makeCounterSlice()
    const combined = combineSlices().withLazyLoadedSlices<
      WithSlice<typeof counterSlice>
    >()

    expect(() => counterSlice.selectSlice({} as any)).toThrow(
      /root state does not contain a "counter" key/,
    )
    // slice.selectors goes through selectSlice, so its error surfaces first.
    expect(() => counterSlice.selectors.selectValue({} as any)).toThrow(
      /root state does not contain a "counter" key/,
    )
    // A custom selectState that returns undefined hits the wrapper's check.
    const custom = counterSlice.getSelectors(
      (rootState: { nested?: CounterState }) => rootState.nested!,
    )
    expect(() => custom.selectValue({})).toThrow(
      /selectState returned undefined for an uninjected slice/,
    )

    const injected = counterSlice.injectInto(combined)

    expect(injected.selectSlice({})).toEqual({ value: 0 })
    expect(injected.selectSlice({})).toBe(injected.selectSlice({}))
    expect(injected.selectors.selectValue({})).toBe(0)

    // The original slice object is unchanged.
    expect(() => counterSlice.selectSlice({} as any)).toThrow()

    // Real state wins once present.
    const store = configureStore({ reducer: combined })
    store.dispatch(counterSlice.actions.increment())
    expect(injected.selectors.selectValue(store.getState())).toBe(1)
    expect(injected.selectSlice(store.getState())).toEqual({ value: 1 })
  })

  it('supports a reducerPath override', () => {
    const counterSlice = makeCounterSlice()
    const combined = combineSlices().withLazyLoadedSlices<{
      aka: CounterState
    }>()

    const injected = counterSlice.injectInto(combined, { reducerPath: 'aka' })

    expect(injected.reducerPath).toBe('aka')
    expect(injected.selectSlice({ aka: { value: 7 } })).toEqual({ value: 7 })
    expect(injected.selectors.selectValue({ aka: { value: 7 } })).toBe(7)

    const store = configureStore({ reducer: combined })
    store.dispatch(counterSlice.actions.increment())
    expect(
      (store.getState() as Record<string, CounterState>).aka.value,
    ).toBe(1)

    // The original slice still points at its own path.
    expect(counterSlice.reducerPath).toBe('counter')
  })

  it('interops with the 2.x combineSlices', () => {
    const staticSlice = createSlice({
      name: 'static',
      initialState: 'static',
      reducers: {},
    })
    const counterSlice = makeCounterSlice()

    const combined2x = combineSlices2x(staticSlice).withLazyLoadedSlices<
      WithSlice<typeof counterSlice>
    >()

    const injected = counterSlice.injectInto(combined2x)

    // v3-side fallback works regardless of the injectable's flavor.
    expect(injected.selectSlice({})).toEqual({ value: 0 })
    expect(injected.selectors.selectValue({})).toBe(0)

    // 2.x-side fill-in works with the v3 slice's wrapper reducer
    // (via the 2.x nanoid probe, since 2.x never looks for getInitialState).
    const selectCounter = combined2x.selector((state) => state.counter)
    expect(selectCounter({ static: 'static' })).toEqual({ value: 0 })

    const store = configureStore({ reducer: combined2x })
    store.dispatch(counterSlice.actions.increment())
    expect(injected.selectors.selectValue(store.getState())).toBe(1)
  })

  it('dispatching through a store set up before injection materializes the slice state', () => {
    const counterSlice = makeCounterSlice()
    const combined = combineSlices().withLazyLoadedSlices<
      WithSlice<typeof counterSlice>
    >()
    const store = configureStore({ reducer: combined })

    expect('counter' in store.getState()).toBe(false)

    counterSlice.injectInto(combined)
    store.dispatch({ type: 'unrelated' } as UnknownAction)

    expect(store.getState().counter).toEqual({ value: 0 })
  })
})
