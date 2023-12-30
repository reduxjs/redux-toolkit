import { vi } from 'vitest'
import type {
  Action,
  AnyListenerPredicate,
  CaseReducer,
  PayloadAction,
  PayloadActionCreator,
  ReducerCreator,
  ReducerCreators,
  ReducerDefinition,
  SliceActionType,
  SliceCaseReducers,
  ThunkAction,
  UnknownAction,
  UnsubscribeListener,
  WithSlice,
} from '@reduxjs/toolkit'
import {
  asyncThunkCreator,
  buildCreateSlice,
  configureStore,
  combineSlices,
  createSlice,
  createAction,
  isAnyOf,
  nanoid,
  addListener,
  createListenerMiddleware,
} from '@reduxjs/toolkit'
import {
  mockConsole,
  createConsole,
  getLog,
} from 'console-testing-library/pure'
import type { CaseReducerDefinition } from '../createSlice'

type CreateSlice = typeof createSlice

describe('createSlice', () => {
  let restore: () => void

  beforeEach(() => {
    restore = mockConsole(createConsole())
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
        })
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
        })
      ).toThrowError()
    })
  })

  describe('when initial state is undefined', () => {
    it('should throw an error', () => {
      createSlice({
        name: 'test',
        reducers: {},
        initialState: undefined,
      })

      expect(getLog().log).toBe(
        'You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`'
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
        })
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
        })
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
      extraReducers: (builder) => {
        builder.addCase(
          addMore,
          (state, action) => state + action.payload.amount
        )
      },

      initialState: 0,
    })

    it('should call extra reducers when their actions are dispatched', () => {
      const result = reducer(10, addMore({ amount: 5 }))

      expect(result).toBe(15)
    })

    describe('builder callback for extraReducers', () => {
      const increment = createAction<number, 'increment'>('increment')

      test('can be used with actionCreators', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: (builder) =>
            builder.addCase(
              increment,
              (state, action) => state + action.payload
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('can be used with string action types', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: (builder) =>
            builder.addCase(
              'increment',
              (state, action: { type: 'increment'; payload: number }) =>
                state + action.payload
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
            extraReducers: (builder) =>
              builder
                .addCase('increment', (state) => state + 1)
                .addCase('increment', (state) => state + 1),
          })
          slice.reducer(undefined, { type: 'unrelated' })
        }).toThrowErrorMatchingInlineSnapshot(
          '"`builder.addCase` cannot be called with two reducers for the same action type \'increment\'"'
        )
      })

      test('can be used with addMatcher and type guard functions', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: (builder) =>
            builder.addMatcher(
              increment.match,
              (state, action: { type: 'increment'; payload: number }) =>
                state + action.payload
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('can be used with addDefaultCase', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: (builder) =>
            builder.addDefaultCase(
              (state, action) =>
                state + (action as PayloadAction<number>).payload
            ),
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      // for further tests, see the test of createReducer that goes way more into depth on this
    })
  })

  describe('behaviour with enhanced case reducers', () => {
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
        expect.objectContaining({ payload: 'testPayload' })
      )
    })
  })

  describe('circularity', () => {
    test('extraReducers can reference each other circularly', () => {
      const first = createSlice({
        name: 'first',
        initialState: 'firstInitial',
        reducers: {
          something() {
            return 'firstSomething'
          },
        },
        extraReducers(builder) {
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
        extraReducers(builder) {
          builder.addCase(first.actions.something, () => {
            return 'secondSomething'
          })
        },
      })

      expect(first.reducer(undefined, { type: 'unrelated' })).toBe(
        'firstInitial'
      )
      expect(first.reducer(undefined, first.actions.something())).toBe(
        'firstSomething'
      )
      expect(first.reducer(undefined, second.actions.other())).toBe(
        'firstOther'
      )

      expect(second.reducer(undefined, { type: 'unrelated' })).toBe(
        'secondInitial'
      )
      expect(second.reducer(undefined, first.actions.something())).toBe(
        'secondSomething'
      )
      expect(second.reducer(undefined, second.actions.other())).toBe(
        'secondOther'
      )
    })
  })

  describe('Deprecation warnings', () => {
    let originalNodeEnv = process.env.NODE_ENV

    beforeEach(() => {
      vi.resetModules()
      restore = mockConsole(createConsole())
    })

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv
    })

    // NOTE: This needs to be in front of the later `createReducer` call to check the one-time warning
    it('Throws an error if the legacy object notation is used', async () => {
      const { createSlice } = await import('../createSlice')

      let dummySlice = (createSlice as CreateSlice)({
        name: 'dummy',
        initialState: [],
        reducers: {},
        extraReducers: {
          // @ts-ignore
          a: () => [],
        },
      })
      let reducer: any
      // Have to trigger the lazy creation
      const wrapper = () => {
        reducer = dummySlice.reducer
        reducer(undefined, { type: 'dummy' })
      }

      expect(wrapper).toThrowError(
        /The object notation for `createSlice.extraReducers` has been removed/
      )

      dummySlice = (createSlice as CreateSlice)({
        name: 'dummy',
        initialState: [],
        reducers: {},
        extraReducers: {
          // @ts-ignore
          a: () => [],
        },
      })
      expect(wrapper).toThrowError(
        /The object notation for `createSlice.extraReducers` has been removed/
      )
    })

    // TODO Determine final production behavior here
    it.skip('Crashes in production', () => {
      process.env.NODE_ENV = 'production'
      const { createSlice } = require('../createSlice')

      let dummySlice = (createSlice as CreateSlice)({
        name: 'dummy',
        initialState: [],
        reducers: {},
        // @ts-ignore
        extraReducers: {},
      })
      const wrapper = () => {
        let reducer = dummySlice.reducer
        reducer(undefined, { type: 'dummy' })
      }

      expect(wrapper).toThrowError(
        /The object notation for `createSlice.extraReducers` has been removed/
      )
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
          { test: 0 }
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
        (state: typeof customState) => state.number
      )
      expect(selectSlice(customState)).toBe(slice.getInitialState())
      expect(selectMultiple(customState, 2)).toBe(slice.getInitialState() * 2)
    })
    it('allows accessing properties on the selector', () => {
      expect(slice.selectors.selectMultiple.unwrapped.test).toBe(0)
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
        slice.getInitialState()
      )

      const injectedState = combinedReducer(undefined, increment())

      expect(injectedSlice.selectSlice(injectedState)).toBe(
        slice.getInitialState() + 1
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
        slice.getInitialState() + 1
      )
      expect(injected.selectors.selectMultiple(injectedState, 2)).toBe(
        (slice.getInitialState() + 1) * 2
      )

      const injected2 = slice.injectInto(combinedReducer, {
        reducerPath: 'injected2',
      })

      const injected2State = combinedReducer(undefined, increment())

      expect(injected2.selectSlice(injected2State)).toBe(
        slice.getInitialState() + 1
      )
      expect(injected2.selectors.selectMultiple(injected2State, 2)).toBe(
        (slice.getInitialState() + 1) * 2
      )
    })
  })
  describe('reducers definition with asyncThunks', () => {
    it('is disabled by default', () => {
      expect(() =>
        createSlice({
          name: 'test',
          initialState: [] as any[],
          // @ts-expect-error asyncThunk not in creators
          reducers: (create) => ({ thunk: create.asyncThunk(() => {}) }),
        })
      ).toThrowErrorMatchingInlineSnapshot(
        '"create.asyncThunk is not a function"'
      )
    })
    const createThunkSlice = buildCreateSlice({
      creators: { asyncThunk: asyncThunkCreator },
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
      const slice = createThunkSlice({
        name: 'test',
        initialState: [] as any[],
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
              return Promise.resolve('resolved payload')
            },
            { pending, fulfilled, rejected, settled }
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
      const slice = createThunkSlice({
        name: 'test',
        initialState: [] as any[],
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            // payloadCreator isn't allowed to return never
            function payloadCreator(arg, api): any {
              throw new Error('')
            },
            { pending, fulfilled, rejected, settled }
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
      const slice = createThunkSlice({
        name: 'test',
        initialState: [] as any[],
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
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
            }
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
      const slice = createThunkSlice({
        name: 'test',
        initialState: [],
        reducers: (create) => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
              return Promise.resolve('resolved payload')
            },
            { pending, fulfilled, settled }
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
            {}
          )
        )
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
            }
          ),
        }),
      })

      expect(
        slice.reducer([], slice.actions.prepared('test', 1, { message: 'err' }))
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

    test('throws an error when invoked with a normal `prepare` object that has not gone through a `create.preparedReducer` call', async () => {
      expect(() =>
        createSlice({
          name: 'test',
          initialState: [] as any[],
          reducers: (create) => ({
            prepared: {
              prepare: (p: string, m: number, e: { message: string }) => ({
                payload: p,
                meta: m,
                error: e,
              }),
              reducer: (state, action) => {
                state.push(action)
              },
            },
          }),
        })
      ).toThrowErrorMatchingInlineSnapshot(
        '"Please use reducer creators passed to callback. Each reducer definition must have a `_reducerDefinitionType` property indicating which handler to use."'
      )
    })
  })
  describe('custom slice reducer creators', () => {
    const loaderCreator: ReducerCreator<'loader'> = {
      type: 'loader',
      define(reducers) {
        return {
          _reducerDefinitionType: 'loader',
          ...reducers,
        }
      },
      handle({ reducerName, type }, { started, ended }, context) {
        const startedAction = createAction<string>(type + '/started')
        const endedAction = createAction<string>(type + '/ended')

        function thunkCreator(): ThunkAction<
          { loaderId: string; end: () => void },
          unknown,
          unknown,
          Action
        > {
          return (dispatch) => {
            const loaderId = nanoid()
            dispatch(startedAction(loaderId))
            return {
              loaderId,
              end: () => {
                dispatch(endedAction(loaderId))
              },
            }
          }
        }
        Object.assign(thunkCreator, {
          started: startedAction,
          ended: endedAction,
        })

        if (started) context.addCase(startedAction, started)
        if (ended) context.addCase(endedAction, ended)

        context.exposeAction(reducerName, thunkCreator)
        context.exposeCaseReducer(reducerName, { started, ended })
      },
    }

    const conditionCreator: ReducerCreator<'condition'> = {
      type: 'condition',
      define(makePredicate) {
        return { _reducerDefinitionType: 'condition', makePredicate }
      },
      handle({ reducerName, type }, { makePredicate }, context) {
        const trigger = createAction(type, (id: string, args: unknown[]) => ({
          payload: id,
          meta: { args },
        }))
        function thunkCreator(
          timeout?: number,
          ...args: any[]
        ): ThunkAction<
          Promise<boolean> & { unsubscribe?: UnsubscribeListener },
          unknown,
          unknown,
          UnknownAction
        > {
          const predicate = makePredicate(...args)
          return (dispatch) => {
            const listenerId = nanoid()
            let unsubscribe: UnsubscribeListener | undefined = undefined
            const promise = new Promise<boolean>((resolve, reject) => {
              unsubscribe = dispatch(
                addListener({
                  predicate: (action) =>
                    trigger.match(action) && action.payload === listenerId,
                  effect: (_, { condition, unsubscribe, signal }) => {
                    signal.addEventListener('abort', () => reject(false))
                    return condition(predicate, timeout)
                      .then(resolve)
                      .catch(reject)
                      .finally(unsubscribe)
                  },
                })
              ) as any
              dispatch(trigger(listenerId, args))
            })
            return Object.assign(promise, { unsubscribe })
          }
        }
        context.exposeAction(reducerName, thunkCreator)
      },
    }
    const fetchCreator: ReducerCreator<'fetch'> = {
      type: 'fetch',
      define() {
        return {
          start: this.reducer((state) => {
            state.status = 'loading'
          }),
          success: this.reducer<any>((state, action) => {
            state.data = action.payload
            state.status = 'finished'
          }),
        }
      },
      handle() {
        throw new Error("Shouldn't ever happen")
      },
    }
    test('allows passing custom reducer creators, which can add actions and case reducers', () => {
      const createLoaderSlice = buildCreateSlice({
        creators: { loader: loaderCreator },
      })

      const loaderSlice = createLoaderSlice({
        name: 'loader',
        initialState: {} as Partial<Record<string, true>>,
        reducers: (create) => ({
          addLoader: create.loader({
            started: (state, { payload }) => {
              state[payload] = true
            },
            ended: (state, { payload }) => {
              delete state[payload]
            },
          }),
        }),
        selectors: {
          selectLoader: (state, id: string) => state[id],
        },
      })

      const { addLoader } = loaderSlice.actions
      const { selectLoader } = loaderSlice.selectors

      expect(addLoader).toEqual(expect.any(Function))
      expect(addLoader.started).toEqual(expect.any(Function))
      expect(addLoader.started.type).toBe('loader/addLoader/started')

      const isLoaderAction = isAnyOf(addLoader.started, addLoader.ended)

      const store = configureStore({
        reducer: {
          [loaderSlice.reducerPath]: loaderSlice.reducer,
          actions: (state: PayloadAction<string>[] = [], action) =>
            isLoaderAction(action) ? [...state, action] : state,
        },
      })

      expect(loaderSlice.selectSlice(store.getState())).toEqual({})

      const { loaderId, end } = store.dispatch(addLoader())
      expect(selectLoader(store.getState(), loaderId)).toBe(true)

      end()
      expect(selectLoader(store.getState(), loaderId)).toBe(undefined)

      expect(store.getState().actions).toEqual([
        addLoader.started(loaderId),
        addLoader.ended(loaderId),
      ])
    })

    function withStatus<P extends PromiseLike<any>>(promiseLike: P) {
      const assigned = Object.assign(promiseLike, {
        status: 'pending' as 'pending' | 'fulfilled' | 'rejected',
      })
      promiseLike.then(
        () => (assigned.status = 'fulfilled'),
        () => (assigned.status = 'rejected')
      )
      return assigned
    }

    test('condition creator', async () => {
      const createConditionSlice = buildCreateSlice({
        creators: { condition: conditionCreator },
      })

      const counterSlice = createConditionSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: (create) => ({
          increment: create.reducer((state) => void state.value++),
          waitUntilValue: create.condition(
            (value: number) =>
              (_action, state): boolean =>
                counterSlice.selectors.selectValue(state as any) === value
          ),
        }),
        selectors: {
          selectValue: (state) => state.value,
        },
      })

      const {
        actions: { increment, waitUntilValue },
        selectors: { selectValue },
      } = counterSlice

      const listener = createListenerMiddleware()

      const reducer = combineSlices(counterSlice)

      const store = configureStore({
        reducer,
        middleware: (gDM) => gDM().concat(listener.middleware),
      })

      const promise = withStatus(store.dispatch(waitUntilValue(undefined, 5)))
      expect(promise).toEqual(expect.any(Promise))
      expect(promise.unsubscribe).toEqual(expect.any(Function))

      for (let i = 1; i <= 4; i++) {
        store.dispatch(increment())
        expect(selectValue(store.getState())).toBe(i)
        expect(promise.status).toBe('pending')
      }
      store.dispatch(increment())
      expect(selectValue(store.getState())).toBe(5)
      await expect(promise).resolves.toBe(true)
      expect(promise.status).toBe('fulfilled')
    })
    test('creators can return multiple definitions to be spread', () => {
      const createFetchSlice = buildCreateSlice({
        creators: { fetchReducers: fetchCreator },
      })

      const fetchSlice = createFetchSlice({
        name: 'fetch',
        initialState: { status: 'loading' } as FetchState<string>,
        reducers: (create) => ({
          ...create.fetchReducers(),
          magic: create.reducer((state) => {
            state.status = 'finished'
            state.data = 'hocus pocus'
          }),
        }),
      })

      const { start, success, magic } = fetchSlice.actions

      expect(start).toEqual(expect.any(Function))
      expect(start.type).toBe('fetch/start')
    })
    test.skip('creators can discourage their use if state is incompatible (types only)', () => {
      const createFetchSlice = buildCreateSlice({
        creators: { fetchReducers: fetchCreator },
      })

      const counterSlice = createFetchSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: (create) => ({
          // @ts-expect-error
          ...create.fetchReducers(),
        }),
      })
    })
  })
})

interface LoaderReducerDefinition<State> extends ReducerDefinition<'loader'> {
  started?: CaseReducer<State, PayloadAction<string>>
  ended?: CaseReducer<State, PayloadAction<string>>
}

interface FetchState<T> {
  data?: T
  status: 'loading' | 'finished' | 'error'
}

declare module '@reduxjs/toolkit' {
  export interface ReducerTypes {
    loader: true
    condition: true
    fetch: true
  }
  export interface SliceReducerCreators<
    State = any,
    CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
    Name extends string = string
  > {
    loader: {
      create(
        reducers: Pick<LoaderReducerDefinition<State>, 'ended' | 'started'>
      ): LoaderReducerDefinition<State>
      actions: {
        [ReducerName in keyof CaseReducers as CaseReducers[ReducerName] extends LoaderReducerDefinition<State>
          ? ReducerName
          : never]: (() => ThunkAction<
          { loaderId: string; end: () => void },
          unknown,
          unknown,
          Action
        >) & {
          started: PayloadActionCreator<
            string,
            `${SliceActionType<Name, ReducerName>}/started`
          >
          ended: PayloadActionCreator<
            string,
            `${SliceActionType<Name, ReducerName>}/ended`
          >
        }
      }
      caseReducers: {
        [ReducerName in keyof CaseReducers as CaseReducers[ReducerName] extends LoaderReducerDefinition<State>
          ? ReducerName
          : never]: Required<
          Pick<LoaderReducerDefinition<State>, 'ended' | 'started'>
        >
      }
    }
    condition: {
      create<Args extends any[]>(
        makePredicate: (...args: Args) => AnyListenerPredicate<unknown>
      ): ReducerDefinition<'condition'> & {
        makePredicate: (...args: Args) => AnyListenerPredicate<unknown>
      }
      actions: {
        [ReducerName in keyof CaseReducers as CaseReducers[ReducerName] extends ReducerDefinition<'condition'>
          ? ReducerName
          : never]: CaseReducers[ReducerName] extends {
          makePredicate: (...args: infer Args) => AnyListenerPredicate<unknown>
        }
          ? (
              timeout?: number,
              ...args: Args
            ) => ThunkAction<
              Promise<boolean> & { unsubscribe?: UnsubscribeListener },
              unknown,
              unknown,
              UnknownAction
            >
          : never
      }
      caseReducers: {}
    }
    fetch: {
      create(this: ReducerCreators<State, {}>): State extends FetchState<
        infer Data
      >
        ? {
            start: CaseReducerDefinition<State, PayloadAction>
            success: CaseReducerDefinition<State, PayloadAction<Data>>
          }
        : never
      actions: {}
      caseReducers: {}
    }
  }
}
