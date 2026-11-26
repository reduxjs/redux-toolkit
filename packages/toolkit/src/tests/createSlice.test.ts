import { noop } from '@internal/listenerMiddleware/utils'
import type {
  CreatorContext,
  PayloadAction,
  SliceActionExposure,
  WithSlice,
} from '@reduxjs/toolkit'
import {
  asyncThunkCreator,
  buildCreateSlice,
  combineSlices,
  configureStore,
  createAction,
  createAsyncThunk,
  createSlice,
  immerAdapter,
  makeDefinition,
} from '@reduxjs/toolkit'

describe('createSlice', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(noop)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  describe('when slice is undefined', () => {
    it('should throw an error', () => {
      expect(() =>
        // @ts-ignore
        createSlice({
          reducers: {
            increment: (state) => state + 1,
            multiply: (state, action: PayloadAction<number>) =>
              state * action.payload,
          },
          initialState: 0,
        }),
      ).toThrowError()
    })
  })

  describe('when slice is an empty string', () => {
    it('should throw an error', () => {
      expect(() =>
        createSlice({
          name: '',
          reducers: {
            increment: (state) => state + 1,
            multiply: (state, action: PayloadAction<number>) =>
              state * action.payload,
          },
          initialState: 0,
        }),
      ).toThrowError()
    })
  })

  describe('when initial state is undefined', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('should throw an error', () => {
      createSlice({
        name: 'test',
        reducers: {},
        initialState: undefined,
      })

      expect(consoleErrorSpy).toHaveBeenCalledOnce()

      expect(consoleErrorSpy).toHaveBeenLastCalledWith(
        'You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`',
      )
    })
  })

  describe('when passing slice', () => {
    const { actions, reducer, caseReducers } = createSlice({
      reducers: {
        increment: (state) => state + 1,
      },
      initialState: 0,
      name: 'cool',
    })

    it('should create increment action', () => {
      expect(actions.hasOwnProperty('increment')).toBe(true)
    })

    it('should have the correct action for increment', () => {
      expect(actions.increment()).toEqual({
        type: 'cool/increment',
        payload: undefined,
      })
    })

    it('should return the correct value from reducer', () => {
      expect(reducer(undefined, actions.increment())).toEqual(1)
    })

    it('should include the generated case reducers', () => {
      expect(caseReducers).toBeTruthy()
      expect(caseReducers.increment).toBeTruthy()
      expect(typeof caseReducers.increment).toBe('function')
    })

    it('getInitialState should return the state', () => {
      const initialState = 42
      const slice = createSlice({
        name: 'counter',
        initialState,
        reducers: {},
      })

      expect(slice.getInitialState()).toBe(initialState)
    })

    it('should allow non-draftable initial state', () => {
      expect(() =>
        createSlice({
          name: 'params',
          initialState: new URLSearchParams(),
          reducers: {},
        }),
      ).not.toThrowError()
    })
  })

  describe('when initialState is a function', () => {
    const initialState = () => ({ user: '' })

    const { actions, reducer } = createSlice({
      reducers: {
        setUserName: (state, action) => {
          state.user = action.payload
        },
      },
      initialState,
      name: 'user',
    })

    it('should set the username', () => {
      expect(reducer(undefined, actions.setUserName('eric'))).toEqual({
        user: 'eric',
      })
    })

    it('getInitialState should return the state', () => {
      const initialState = () => 42
      const slice = createSlice({
        name: 'counter',
        initialState,
        reducers: {},
      })

      expect(slice.getInitialState()).toBe(42)
    })

    it('should allow non-draftable initial state', () => {
      expect(() =>
        createSlice({
          name: 'params',
          initialState: () => new URLSearchParams(),
          reducers: {},
        }),
      ).not.toThrowError()
    })
  })

  describe('when mutating state object', () => {
    const initialState = { user: '' }

    const { actions, reducer } = createSlice({
      reducers: {
        setUserName: (state, action) => {
          state.user = action.payload
        },
      },
      initialState,
      name: 'user',
    })

    it('should set the username', () => {
      expect(reducer(initialState, actions.setUserName('eric'))).toEqual({
        user: 'eric',
      })
    })
  })

  describe('when passing extra reducers', () => {
    const addMore = createAction<{ amount: number }>('ADD_MORE')

    const { reducer } = createSlice({
      name: 'test',
      reducers: {
        increment: (state) => state + 1,
        multiply: (state, action) => state * action.payload,
      },
      respondTo: (builder) => {
        builder.addCase(
          addMore,
          (state, action) => state + action.payload.amount,
        )
      },

      initialState: 0,
    })

    it('should call extra reducers when their actions are dispatched', () => {
      const result = reducer(10, addMore({ amount: 5 }))

      expect(result).toBe(15)
    })

    describe('builder callback for respondTo', () => {
      const increment = createAction<number, 'increment'>('increment')

      test('can be used with actionCreators', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          respondTo: (builder) =>
            builder.addCase(
              increment,
              (state, action) => state + action.payload,
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('can be used with string action types', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          respondTo: (builder) =>
            builder.addCase(
              'increment',
              (state, action: { type: 'increment'; payload: number }) =>
                state + action.payload,
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('prevents the same action type from being specified twice', () => {
        expect(() => {
          const slice = createSlice({
            name: 'counter',
            initialState: 0,
            reducers: {},
            respondTo: (builder) =>
              builder
                .addCase('increment', (state) => state + 1)
                .addCase('increment', (state) => state + 1),
          })
          slice.reducer(undefined, { type: 'unrelated' })
        }).toThrowErrorMatchingInlineSnapshot(
          `[Error: \`builder.addCase\` cannot be called with two reducers for the same action type 'increment']`,
        )
      })

      test('can be used with addAsyncThunk and async thunks', () => {
        const asyncThunk = createAsyncThunk('test', (n: number) => n)
        const slice = createSlice({
          name: 'counter',
          initialState: {
            loading: false,
            errored: false,
            value: 0,
          },
          reducers: {},
          respondTo: (builder) =>
            builder.addAsyncThunk(asyncThunk, {
              pending(state) {
                state.loading = true
              },
              fulfilled(state, action) {
                state.value = action.payload
              },
              rejected(state) {
                state.errored = true
              },
              settled(state) {
                state.loading = false
              },
            }),
        })
        expect(
          slice.reducer(undefined, asyncThunk.pending('requestId', 5)),
        ).toEqual({
          loading: true,
          errored: false,
          value: 0,
        })
        expect(
          slice.reducer(undefined, asyncThunk.fulfilled(5, 'requestId', 5)),
        ).toEqual({
          loading: false,
          errored: false,
          value: 5,
        })
        expect(
          slice.reducer(
            undefined,
            asyncThunk.rejected(new Error(), 'requestId', 5),
          ),
        ).toEqual({
          loading: false,
          errored: true,
          value: 0,
        })
      })

      test('can be used with addMatcher and type guard functions', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          respondTo: (builder) =>
            builder.addMatcher(
              increment.match,
              (state, action: { type: 'increment'; payload: number }) =>
                state + action.payload,
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('can be used with addDefaultCase', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          respondTo: (builder) =>
            builder.addDefaultCase(
              (state, action) =>
                state + (action as PayloadAction<number>).payload,
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      // for further tests, see the test of createReducer that goes way more into depth on this
    })
  })

  describe('behavior with enhanced case reducers', () => {
    it('should pass all arguments to the prepare function', () => {
      const prepare = vi.fn((payload, somethingElse) => ({ payload }))

      const testSlice = createSlice({
        name: 'test',
        initialState: 0,
        reducers: {
          testReducer: {
            reducer: (s) => s,
            prepare,
          },
        },
      })

      expect(testSlice.actions.testReducer('a', 1)).toEqual({
        type: 'test/testReducer',
        payload: 'a',
      })
      expect(prepare).toHaveBeenCalledWith('a', 1)
    })

    it('should call the reducer function', () => {
      const reducer = vi.fn(() => 5)

      const testSlice = createSlice({
        name: 'test',
        initialState: 0,
        reducers: {
          testReducer: {
            reducer,
            prepare: (payload: any) => ({ payload }),
          },
        },
      })

      testSlice.reducer(0, testSlice.actions.testReducer('testPayload'))
      expect(reducer).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ payload: 'testPayload' }),
      )
    })
  })

  describe('circularity', () => {
    test('respondTo callbacks can reference each other circularly', () => {
      const first = createSlice({
        name: 'first',
        initialState: 'firstInitial',
        reducers: {
          something() {
            return 'firstSomething'
          },
        },
        respondTo(builder) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          builder.addCase(second.actions.other, () => {
            return 'firstOther'
          })
        },
      })
      const second = createSlice({
        name: 'second',
        initialState: 'secondInitial',
        reducers: {
          other() {
            return 'secondOther'
          },
        },
        respondTo(builder) {
          builder.addCase(first.actions.something, () => {
            return 'secondSomething'
          })
        },
      })

      expect(first.reducer(undefined, { type: 'unrelated' })).toBe(
        'firstInitial',
      )
      expect(first.reducer(undefined, first.actions.something())).toBe(
        'firstSomething',
      )
      expect(first.reducer(undefined, second.actions.other())).toBe(
        'firstOther',
      )

      expect(second.reducer(undefined, { type: 'unrelated' })).toBe(
        'secondInitial',
      )
      expect(second.reducer(undefined, first.actions.something())).toBe(
        'secondSomething',
      )
      expect(second.reducer(undefined, second.actions.other())).toBe(
        'secondOther',
      )
    })
  })

  describe('option validation', () => {
    it('throws at creation time when `extraReducers` is passed', () => {
      expect(() =>
        createSlice({
          name: 'dummy',
          initialState: [],
          reducers: {},
          extraReducers: () => {},
        } as any),
      ).toThrowError(/`extraReducers` option was renamed to `respondTo`/)
    })

    it('throws at creation time when `respondTo` is not a function', () => {
      expect(() =>
        createSlice({
          name: 'dummy',
          initialState: [],
          reducers: {},
          respondTo: { a: () => [] },
        } as any),
      ).toThrowError(/`respondTo` must be a builder callback/)
    })

    it('throws when `creators` is used with the object form of `reducers`', () => {
      expect(() =>
        createSlice({
          name: 'dummy',
          initialState: 0,
          creators: () => ({}),
          reducers: {},
        } as any),
      ).toThrowError(/`creators` option requires the callback form/)
    })

    it('throws on the first reducer call when `reducers` and `respondTo` handle the same type', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: 0,
        reducers: {
          increment: (state) => state + 1,
        },
        respondTo: (builder) => {
          builder.addCase('counter/increment', (state) => state + 2)
        },
      })
      expect(() => slice.reducer(undefined, { type: 'init' })).toThrowError(
        /handled by both `reducers` and `respondTo`/,
      )
    })
  })

  describe('slice shape', () => {
    it('exposes the exact user case reducer functions', () => {
      const increment = (state: number) => state + 1
      const objectSlice = createSlice({
        name: 'counter',
        initialState: 0,
        reducers: { increment },
      })
      expect(objectSlice.caseReducers.increment).toBe(increment)

      const callbackSlice = createSlice({
        name: 'counter',
        initialState: 0,
        reducers: (create) => ({ increment: create.reducer(increment) }),
      })
      expect(callbackSlice.caseReducers.increment).toBe(increment)
    })

    it('has a stable reducer with getInitialState', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: 42,
        reducers: {},
      })
      expect(slice.reducer).toBe(slice.reducer)
      expect(slice.reducer.getInitialState()).toBe(42)
    })

    it('throws when the slice state is missing from the root state', () => {
      const slice = createSlice({
        name: 'todos',
        initialState: [] as string[],
        reducers: {},
        selectors: { selectCount: (state) => state.length },
      })
      expect(() => slice.selectSlice({} as any)).toThrowError(
        /root state does not contain a "todos" key/,
      )
      expect(() => slice.selectors.selectCount({} as any)).toThrowError(
        /root state does not contain a "todos" key/,
      )
    })
  })

  describe('custom creators', () => {
    const resetCreator = (ctx: CreatorContext<any>) =>
      makeDefinition<SliceActionExposure<void>>((details, context) => {
        context
          .addCase(details.type, () => context.getInitialState())
          .exposeAction(createAction(details.type))
          .exposeCaseReducer(() => context.getInitialState())
      })

    it('gives creators a frozen initial state', () => {
      let creatorInitialState: unknown
      const captureCreator = (ctx: CreatorContext<any>) =>
        makeDefinition<SliceActionExposure<void>>((details, context) => {
          creatorInitialState = context.getInitialState()
          context
            .addCase(details.type, () => context.getInitialState())
            .exposeAction(createAction(details.type))
            .exposeCaseReducer(() => context.getInitialState())
        })

      const slice = createSlice({
        name: 'todos',
        initialState: () => ({ todos: [] as string[] }),
        creators: (ctx) => ({ reset: () => captureCreator(ctx) }),
        reducers: (create) => ({
          reset: create.reset(),
        }),
      })

      expect(creatorInitialState).toEqual({ todos: [] })
      expect(Object.isFrozen(creatorInitialState)).toBe(true)

      const state = slice.reducer({ todos: ['a'] }, slice.actions.reset())
      expect(state).toEqual({ todos: [] })
      expect(Object.isFrozen(state)).toBe(true)
    })

    it('allows custom creators via the `creators` option', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: 0,
        creators: (ctx) => ({ reset: () => resetCreator(ctx) }),
        reducers: (create) => ({
          increment: create.reducer((state) => state + 1),
          reset: create.reset(),
        }),
      })

      const state = slice.reducer(slice.reducer(0, slice.actions.increment()), {
        type: 'other',
      })
      expect(state).toBe(1)
      expect(slice.reducer(state, slice.actions.reset())).toBe(0)
      expect(slice.actions.reset.type).toBe('counter/reset')
    })

    it('provides creators passed to buildCreateSlice to every slice', async () => {
      const createAppSlice = buildCreateSlice({
        immutability: immerAdapter,
        creators: { asyncThunk: asyncThunkCreator },
      })

      const slice = createAppSlice({
        name: 'users',
        initialState: { names: [] as string[] },
        reducers: (create) => ({
          fetchNames: create.asyncThunk(async (org: string) => [org], {
            fulfilled: (state, action) => {
              state.names = action.payload
            },
          }),
        }),
      })

      const store = configureStore({ reducer: slice.reducer })
      await store.dispatch(slice.actions.fetchNames('redux'))
      expect(store.getState().names).toEqual(['redux'])
      expect(slice.actions.fetchNames.typePrefix).toBe('users/fetchNames')
    })

    it('lets per-slice creators override factory creators', () => {
      const factoryReset = vi.fn(() => () => {
        throw new Error('factory creator should not be used')
      })
      const createAppSlice = buildCreateSlice({
        immutability: immerAdapter,
        creators: { reset: factoryReset as any },
      })

      const slice = createAppSlice({
        name: 'counter',
        initialState: 0,
        creators: (ctx) => ({ reset: () => resetCreator(ctx) }),
        reducers: (create) => ({
          increment: create.reducer((state) => state + 1),
          reset: create.reset(),
        }),
      })

      expect(slice.reducer(5, slice.actions.reset())).toBe(0)
    })

    it('does not call factory creators for the object form', () => {
      const factoryThunk = vi.fn(asyncThunkCreator)
      const createAppSlice = buildCreateSlice({
        immutability: immerAdapter,
        creators: { asyncThunk: factoryThunk },
      })

      const slice = createAppSlice({
        name: 'counter',
        initialState: 0,
        reducers: { increment: (state) => state + 1 },
      })

      expect(slice.reducer(0, slice.actions.increment())).toBe(1)
      expect(factoryThunk).not.toHaveBeenCalled()
    })
  })

  describe('slice selectors', () => {
    const slice = createSlice({
      name: 'counter',
      initialState: 42,
      reducers: {},
      selectors: {
        selectSlice: (state) => state,
        selectMultiple: Object.assign(
          (state: number, multiplier: number) => state * multiplier,
          { test: 0 },
        ),
      },
    })
    it('expects reducer under slice.reducerPath if no selectState callback passed', () => {
      const testState = {
        [slice.reducerPath]: slice.getInitialState(),
      }
      const { selectSlice, selectMultiple } = slice.selectors
      expect(selectSlice(testState)).toBe(slice.getInitialState())
      expect(selectMultiple(testState, 2)).toBe(slice.getInitialState() * 2)
    })
    it('allows passing a selector for a custom location', () => {
      const customState = {
        number: slice.getInitialState(),
      }
      const { selectSlice, selectMultiple } = slice.getSelectors(
        (state: typeof customState) => state.number,
      )
      expect(selectSlice(customState)).toBe(slice.getInitialState())
      expect(selectMultiple(customState, 2)).toBe(slice.getInitialState() * 2)
    })
    it('allows accessing properties on the selector', () => {
      expect(slice.selectors.selectMultiple.unwrapped.test).toBe(0)
    })
    it('has selectSlice attached to slice, which can go without this', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: 42,
        reducers: {},
      })
      const { selectSlice } = slice
      expect(() => selectSlice({ counter: 42 })).not.toThrow()
      expect(selectSlice({ counter: 42 })).toBe(42)
    })
  })
  describe('slice injections', () => {
    it('uses injectInto to inject slice into combined reducer', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: 42,
        reducers: {
          increment: (state) => ++state,
        },
        selectors: {
          selectMultiple: (state, multiplier: number) => state * multiplier,
        },
      })

      const { increment } = slice.actions

      const combinedReducer = combineSlices({
        static: slice.reducer,
      }).withLazyLoadedSlices<WithSlice<typeof slice>>()

      const uninjectedState = combinedReducer(undefined, increment())

      expect(uninjectedState.counter).toBe(undefined)

      const injectedSlice = slice.injectInto(combinedReducer)

      // selector returns initial state if undefined in real state
      expect(injectedSlice.selectSlice(uninjectedState)).toBe(
        slice.getInitialState(),
      )
      expect(injectedSlice.selectors.selectMultiple({}, 1)).toBe(
        slice.getInitialState(),
      )
      expect(injectedSlice.getSelectors().selectMultiple(undefined, 1)).toBe(
        slice.getInitialState(),
      )

      const injectedState = combinedReducer(undefined, increment())

      expect(injectedSlice.selectSlice(injectedState)).toBe(
        slice.getInitialState() + 1,
      )
      expect(injectedSlice.selectors.selectMultiple(injectedState, 1)).toBe(
        slice.getInitialState() + 1,
      )
    })
    it('allows providing a custom name to inject under', () => {
      const slice = createSlice({
        name: 'counter',
        reducerPath: 'injected',
        initialState: 42,
        reducers: {
          increment: (state) => ++state,
        },
        selectors: {
          selectMultiple: (state, multiplier: number) => state * multiplier,
        },
      })

      const { increment } = slice.actions

      const combinedReducer = combineSlices({
        static: slice.reducer,
      }).withLazyLoadedSlices<WithSlice<typeof slice> & { injected2: number }>()

      const uninjectedState = combinedReducer(undefined, increment())

      expect(uninjectedState.injected).toBe(undefined)

      const injected = slice.injectInto(combinedReducer)

      const injectedState = combinedReducer(undefined, increment())

      expect(injected.selectSlice(injectedState)).toBe(
        slice.getInitialState() + 1,
      )
      expect(injected.selectors.selectMultiple(injectedState, 2)).toBe(
        (slice.getInitialState() + 1) * 2,
      )

      const injected2 = slice.injectInto(combinedReducer, {
        reducerPath: 'injected2',
      })

      const injected2State = combinedReducer(undefined, increment())

      expect(injected2.selectSlice(injected2State)).toBe(
        slice.getInitialState() + 1,
      )
      expect(injected2.selectors.selectMultiple(injected2State, 2)).toBe(
        (slice.getInitialState() + 1) * 2,
      )
    })
    it('avoids incorrectly caching selectors', () => {
      const slice = createSlice({
        name: 'counter',
        reducerPath: 'injected',
        initialState: 42,
        reducers: {
          increment: (state) => ++state,
        },
        selectors: {
          selectMultiple: (state, multiplier: number) => state * multiplier,
        },
      })
      expect(slice.getSelectors()).toBe(slice.getSelectors())
      const combinedReducer = combineSlices({
        static: slice.reducer,
      }).withLazyLoadedSlices<WithSlice<typeof slice>>()

      const injected = slice.injectInto(combinedReducer)

      expect(injected.getSelectors()).not.toBe(slice.getSelectors())

      expect(injected.getSelectors().selectMultiple(undefined, 1)).toBe(42)

      expect(() =>
        // @ts-expect-error
        slice.getSelectors().selectMultiple(undefined, 1),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: [slice counter] selector: selectState returned undefined for an uninjected slice. Is the slice reducer included in the store?]`,
      )

      const injected2 = slice.injectInto(combinedReducer, {
        reducerPath: 'other',
      })

      // can use same cache for localised selectors
      expect(injected.getSelectors()).toBe(injected2.getSelectors())
      // these should be different
      expect(injected.selectors).not.toBe(injected2.selectors)
    })
    it('caches initial states for selectors', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: () => ({ value: 0 }),
        reducers: {},
        selectors: {
          selectObj: (state) => state,
        },
      })
      // not cached
      expect(slice.getInitialState()).not.toBe(slice.getInitialState())
      expect(slice.reducer(undefined, { type: 'dummy' })).not.toBe(
        slice.reducer(undefined, { type: 'dummy' }),
      )

      const combinedReducer = combineSlices({
        static: slice.reducer,
      }).withLazyLoadedSlices<WithSlice<typeof slice>>()

      const injected = slice.injectInto(combinedReducer)

      // still not cached
      expect(injected.getInitialState()).not.toBe(injected.getInitialState())
      expect(injected.reducer(undefined, { type: 'dummy' })).not.toBe(
        injected.reducer(undefined, { type: 'dummy' }),
      )
      // cached
      expect(injected.selectSlice({})).toBe(injected.selectSlice({}))
      expect(injected.selectors.selectObj({})).toBe(
        injected.selectors.selectObj({}),
      )
    })
  })
  describe('reducers definition with asyncThunks', () => {
    it('is not available without the creators option', () => {
      expect.assertions(1)
      createSlice({
        name: 'test',
        initialState: [] as any[],
        reducers: (create) => {
          expect('asyncThunk' in create).toBe(false)
          return {}
        },
      })
    })
    function pending(state: any[], action: any) {
      state.push(['pendingReducer', action])
    }
    function fulfilled(state: any[], action: any) {
      state.push(['fulfilledReducer', action])
    }
    function rejected(state: any[], action: any) {
      state.push(['rejectedReducer', action])
    }
    function settled(state: any[], action: any) {
      state.push(['settledReducer', action])
    }

    test('successful thunk', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [] as any[],
        creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg: string, api) {
              return Promise.resolve('resolved payload')
            },
            { pending, fulfilled, rejected, settled },
          ),
        }),
      })

      const store = configureStore({
        reducer: slice.reducer,
      })
      await store.dispatch(slice.actions.thunkReducers('test'))
      expect(store.getState()).toMatchObject([
        [
          'pendingReducer',
          {
            type: 'test/thunkReducers/pending',
            payload: undefined,
          },
        ],
        [
          'fulfilledReducer',
          {
            type: 'test/thunkReducers/fulfilled',
            payload: 'resolved payload',
          },
        ],
        [
          'settledReducer',
          {
            type: 'test/thunkReducers/fulfilled',
            payload: 'resolved payload',
          },
        ],
      ])
    })

    test('rejected thunk', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [] as any[],
        creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            // payloadCreator isn't allowed to return never
            function payloadCreator(arg: string, api): any {
              throw new Error('')
            },
            { pending, fulfilled, rejected, settled },
          ),
        }),
      })

      const store = configureStore({
        reducer: slice.reducer,
      })
      await store.dispatch(slice.actions.thunkReducers('test'))
      expect(store.getState()).toMatchObject([
        [
          'pendingReducer',
          {
            type: 'test/thunkReducers/pending',
            payload: undefined,
          },
        ],
        [
          'rejectedReducer',
          {
            type: 'test/thunkReducers/rejected',
            payload: undefined,
          },
        ],
        [
          'settledReducer',
          {
            type: 'test/thunkReducers/rejected',
            payload: undefined,
          },
        ],
      ])
    })

    test('with options', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [] as any[],
        creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg: string, api) {
              return 'should not call this'
            },
            {
              options: {
                condition() {
                  return false
                },
                dispatchConditionRejection: true,
              },
              pending,
              fulfilled,
              rejected,
              settled,
            },
          ),
        }),
      })

      const store = configureStore({
        reducer: slice.reducer,
      })
      await store.dispatch(slice.actions.thunkReducers('test'))
      expect(store.getState()).toMatchObject([
        [
          'rejectedReducer',
          {
            type: 'test/thunkReducers/rejected',
            payload: undefined,
            meta: { condition: true },
          },
        ],
        [
          'settledReducer',
          {
            type: 'test/thunkReducers/rejected',
            payload: undefined,
            meta: { condition: true },
          },
        ],
      ])
    })

    test('has caseReducers for the asyncThunk', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [] as any[],
        creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg: string, api) {
              return Promise.resolve('resolved payload')
            },
            { pending, fulfilled, settled },
          ),
        }),
      })

      expect(slice.caseReducers.thunkReducers.pending).toBe(pending)
      expect(slice.caseReducers.thunkReducers.fulfilled).toBe(fulfilled)
      expect(slice.caseReducers.thunkReducers.settled).toBe(settled)
      // even though it is not defined above, this should at least be a no-op function to match the TypeScript typings
      // and should be callable as a reducer even if it does nothing
      expect(() =>
        slice.caseReducers.thunkReducers.rejected(
          [],
          slice.actions.thunkReducers.rejected(
            new Error('test'),
            'fakeRequestId',
            'test',
          ),
        ),
      ).not.toThrow()
    })

    test('can define reducer with prepare statement using create.preparedReducer', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [] as any[],
        reducers: (create) => ({
          prepared: create.preparedReducer(
            (p: string, m: number, e: { message: string }) => ({
              payload: p,
              meta: m,
              error: e,
            }),
            (state, action) => {
              state.push(action)
            },
          ),
        }),
      })

      expect(
        slice.reducer(
          [],
          slice.actions.prepared('test', 1, { message: 'err' }),
        ),
      ).toMatchInlineSnapshot(`
        [
          {
            "error": {
              "message": "err",
            },
            "meta": 1,
            "payload": "test",
            "type": "test/prepared",
          },
        ]
      `)
    })

    test('throws an error for an invalid reducer definition', () => {
      expect(() =>
        createSlice({
          name: 'test',
          initialState: [] as any[],
          reducers: () => ({ invalid: 'not a reducer' }) as any,
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: [slice test] invalid reducer definition for "invalid": expected a case reducer function, a { reducer, prepare } object, or a creator definition]`,
      )
    })

    test('dispatches a thunk created by create.asyncThunk through a store', async () => {
      const slice = createSlice({
        name: 'users',
        initialState: { status: 'idle', name: '', settledCount: 0 },
        creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
        reducers: (create) => ({
          fetchUser: create.asyncThunk(async (id: number) => `user ${id}`, {
            pending: (state) => {
              state.status = 'loading'
            },
            fulfilled: (state, action) => {
              state.status = 'idle'
              state.name = action.payload
            },
            settled: (state) => {
              state.settledCount++
            },
          }),
        }),
      })

      const store = configureStore({ reducer: slice.reducer })
      const promise = store.dispatch(slice.actions.fetchUser(1))
      expect(store.getState().status).toBe('loading')
      await promise
      expect(store.getState()).toEqual({
        status: 'idle',
        name: 'user 1',
        settledCount: 1,
      })
    })
  })
})
