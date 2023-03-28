import { createReducer } from '../createReducer'
import { createAction } from '../createAction'
import { createSlice } from '../createSlice'
import type { WithApi, WithSlice } from '../combineSlices'
import { combineSlices } from '../combineSlices'
import { expectType } from './helpers'
import type { CombinedState } from '../query/core/apiState'

const dummyAction = createAction<void>('dummy')

const stringSlice = createSlice({
  name: 'string',
  initialState: '',
  reducers: {},
})

const numberSlice = createSlice({
  name: 'number',
  initialState: 0,
  reducers: {},
})

const booleanReducer = createReducer(false, () => {})

// mimic - we can't use RTKQ here directly
const api = {
  reducerPath: 'api' as const,
  reducer: createReducer(
    expectType<CombinedState<{}, never, 'api'>>({
      queries: {},
      mutations: {},
      provided: {},
      subscriptions: {},
      config: {
        reducerPath: 'api',
        online: false,
        focused: false,
        keepUnusedDataFor: 60,
        middlewareRegistered: false,
        refetchOnMountOrArgChange: false,
        refetchOnReconnect: false,
        refetchOnFocus: false,
      },
    }),
    () => {}
  ),
}

describe('combineSlices', () => {
  it('calls combineReducers to combine static slices/reducers', () => {
    const combinedReducer = combineSlices(
      stringSlice,
      {
        num: numberSlice.reducer,
        boolean: booleanReducer,
      },
      api
    )
    expect(combinedReducer(undefined, dummyAction())).toEqual({
      string: stringSlice.getInitialState(),
      num: numberSlice.getInitialState(),
      boolean: booleanReducer.getInitialState(),
      api: api.reducer.getInitialState(),
    })
  })
  describe('injects', () => {
    it('injects slice', () => {
      const combinedReducer =
        combineSlices(stringSlice).withLazyLoadedSlices<
          WithSlice<typeof numberSlice>
        >()

      expect(combinedReducer(undefined, dummyAction()).number).toBe(undefined)

      const injectedReducer = combinedReducer.inject(numberSlice)

      expect(injectedReducer(undefined, dummyAction()).number).toBe(
        numberSlice.getInitialState()
      )
    })
    it('logs error when same name is used for different reducers', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const combinedReducer =
        combineSlices(stringSlice).withLazyLoadedSlices<{ boolean: boolean }>()

      combinedReducer.inject({ name: 'boolean', reducer: booleanReducer })

      combinedReducer.inject({
        name: 'boolean',
        reducer: booleanReducer,
      })

      expect(spy).not.toHaveBeenCalled()

      // @ts-expect-error wrong reducer
      combinedReducer.inject({
        name: 'boolean',
        reducer: stringSlice.reducer,
      })

      expect(spy).toHaveBeenCalledWith(
        `called \`inject\` to override already-existing reducer boolean without specifying \`overrideExisting: true\``
      )
      spy.mockRestore()
    })
    it('allows replacement of reducers if overrideExisting is true', () => {
      const combinedReducer = combineSlices(stringSlice).withLazyLoadedSlices<
        WithSlice<typeof numberSlice> &
          WithApi<typeof api> & { boolean: boolean }
      >()

      combinedReducer.inject(numberSlice)

      // for brevity
      const anyReducer = createReducer({} as any, () => {})

      expect(() =>
        combinedReducer.inject(
          { name: 'number', reducer: anyReducer },
          { overrideExisting: true }
        )
      ).not.toThrow()
    })
  })
  describe('selector', () => {
    const combinedReducer =
      combineSlices(stringSlice).withLazyLoadedSlices<{ boolean: boolean }>()

    const uninjectedState = combinedReducer(undefined, dummyAction())

    const injectedReducer = combinedReducer.inject({
      name: 'boolean',
      reducer: booleanReducer,
    })

    it('ensures state is defined in selector even if action has not been dispatched', () => {
      expect(uninjectedState.boolean).toBe(undefined)

      const selectBoolean = injectedReducer.selector((state) => state.boolean)

      expect(selectBoolean(uninjectedState)).toBe(
        booleanReducer.getInitialState()
      )
    })
    it('exposes original to allow for logging', () => {
      const selectBoolean = injectedReducer.selector(
        (state) => injectedReducer.selector.original(state).boolean
      )
      expect(selectBoolean(uninjectedState)).toBe(undefined)
    })
    it('throws if original is called on something other than state proxy', () => {
      expect(() => injectedReducer.selector.original({} as any)).toThrow(
        'original must be used on state Proxy'
      )
    })
    it('allows passing a selectState selector, to handle nested state', () => {
      const wrappedReducer = combineSlices({
        inner: combinedReducer,
      })

      type RootState = ReturnType<typeof wrappedReducer>

      const selector = injectedReducer.selector(
        (state) => state.boolean,
        (rootState: RootState) => rootState.inner
      )

      expect(selector(wrappedReducer(undefined, dummyAction()))).toBe(
        booleanReducer.getInitialState()
      )
    })
  })
})
