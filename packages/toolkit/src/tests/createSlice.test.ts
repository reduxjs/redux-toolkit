import { vi } from 'vitest'
import type { Patch } from 'immer'
import { applyPatches, enablePatches, produceWithPatches } from 'immer'
import type {
  Action,
  AnyListenerPredicate,
  CaseReducer,
  CaseReducerDefinition,
  PayloadAction,
  PayloadActionCreator,
  PreparedCaseReducerDefinition,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  ReducerDefinition,
  ReducerNamesOfType,
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
  createNextState,
  reducerCreator,
  ReducerType,
  prepareAutoBatched,
  SHOULD_AUTOBATCH,
} from '@reduxjs/toolkit'
import {
  mockConsole,
  createConsole,
  getLog,
} from 'console-testing-library/pure'
import type { IfMaybeUndefined, NoInfer } from '../tsHelpers'
enablePatches()

type CreateSlice = typeof createSlice

const loaderCreatorType = Symbol()
const conditionCreatorType = Symbol()
const fetchCreatorType = Symbol()
const paginationCreatorType = Symbol()
const historyMethodsCreatorType = Symbol()
const undoableCreatorType = Symbol()
const batchedCreatorType = Symbol()

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
    const createAppSlice = buildCreateSlice({
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
      const slice = createAppSlice({
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
      const slice = createAppSlice({
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
      const slice = createAppSlice({
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
      const slice = createAppSlice({
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
    const loaderCreator: ReducerCreator<typeof loaderCreatorType> = {
      type: loaderCreatorType,
      create(reducers) {
        return {
          _reducerDefinitionType: loaderCreatorType,
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
    test('allows passing custom reducer creators, which can add actions and case reducers', () => {
      const createAppSlice = buildCreateSlice({
        creators: { loader: loaderCreator },
      })

      const loaderSlice = createAppSlice({
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

    const conditionCreator: ReducerCreator<typeof conditionCreatorType> = {
      type: conditionCreatorType,
      create(makePredicate) {
        return { _reducerDefinitionType: conditionCreatorType, makePredicate }
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
      const createAppSlice = buildCreateSlice({
        creators: { condition: conditionCreator },
      })

      const counterSlice = createAppSlice({
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
    describe('creators can return multiple definitions to be spread', () => {
      const fetchCreator: ReducerCreator<typeof fetchCreatorType> = {
        type: fetchCreatorType,
        create() {
          return {
            start: this.reducer((state: FetchState<unknown>) => {
              state.status = 'loading'
            }),
            success: this.reducer<any>((state: FetchState<unknown>, action) => {
              state.data = action.payload
              state.status = 'finished'
            }),
          }
        },
      }
      test('fetch slice', () => {
        const createAppSlice = buildCreateSlice({
          creators: { fetchReducers: fetchCreator },
        })

        const fetchSlice = createAppSlice({
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
      test('pagination slice', () => {
        const paginationCreator: ReducerCreator<typeof paginationCreatorType> =
          {
            type: paginationCreatorType,
            create() {
              return {
                nextPage: this.reducer((state: PaginationState) => {
                  state.page++
                }),
                previousPage: this.reducer((state: PaginationState) => {
                  state.page = Math.max(0, state.page - 1)
                }),
                goToPage: this.reducer<number>(
                  (state: PaginationState, action) => {
                    state.page = action.payload
                  }
                ),
              }
            },
          }
        const createAppSlice = buildCreateSlice({
          creators: { paginationReducers: paginationCreator },
        })

        const paginationSlice = createAppSlice({
          name: 'pagination',
          initialState: {
            page: 1,
            hasMoreData: true,
          },
          reducers: (create) => ({
            ...create.paginationReducers(),
            noMoreData: create.reducer((state) => {
              state.hasMoreData = false
            }),
          }),
          selectors: {
            selectPage: (state) => state.page,
            selectHasMoreData: (state) => state.hasMoreData,
          },
        })
        const { nextPage, previousPage, goToPage } = paginationSlice.actions
        const { selectHasMoreData, selectPage } = paginationSlice.selectors

        const store = configureStore({
          reducer: { [paginationSlice.reducerPath]: paginationSlice.reducer },
        })

        expect(selectPage(store.getState())).toBe(1)

        store.dispatch(nextPage())

        expect(selectPage(store.getState())).toBe(2)
      })
      test('history slice', () => {
        function getInitialHistoryState<T>(initialState: T): HistoryState<T> {
          return {
            past: [],
            present: initialState,
            future: [],
          }
        }
        const historyMethodsCreator: ReducerCreator<
          typeof historyMethodsCreatorType
        > = {
          type: historyMethodsCreatorType,
          create() {
            return {
              undo: this.reducer((state: HistoryState<unknown>) => {
                const historyEntry = state.past.pop()
                if (historyEntry) {
                  applyPatches(state, historyEntry.undo)
                  state.future.unshift(historyEntry)
                }
              }),
              redo: this.reducer((state: HistoryState<unknown>) => {
                const historyEntry = state.future.shift()
                if (historyEntry) {
                  applyPatches(state, historyEntry.redo)
                  state.past.push(historyEntry)
                }
              }),
              reset: {
                _reducerDefinitionType: historyMethodsCreatorType,
                type: 'reset',
              },
            }
          },
          handle(details, definition, context) {
            if (definition.type !== 'reset') {
              throw new Error('unrecognised definition')
            }
            reducerCreator.handle(
              details,
              reducerCreator.create(() => context.getInitialState()),
              context
            )
          },
        }

        const undoableCreator: ReducerCreator<typeof undoableCreatorType> = {
          type: undoableCreatorType,
          create: Object.assign(
            function makeUndoable<
              A extends Action & { meta?: UndoableOptions }
            >(reducer: CaseReducer<any, A>): CaseReducer<HistoryState<any>, A> {
              return (state, action) => {
                const [nextState, redoPatch, undoPatch] = produceWithPatches(
                  state,
                  (draft) => {
                    const result = reducer(draft.present, action)
                    if (typeof result !== 'undefined') {
                      draft.present = result
                    }
                  }
                )
                let finalState = nextState
                const undoable = action.meta?.undoable ?? true
                if (undoable) {
                  finalState = createNextState(finalState, (draft) => {
                    draft.past.push({
                      undo: undoPatch,
                      redo: redoPatch,
                    })
                    draft.future = []
                  })
                }
                return finalState
              }
            },
            {
              withoutPayload() {
                return (options?: UndoableOptions) => ({
                  payload: undefined,
                  meta: options,
                })
              },
              withPayload<P>() {
                return (
                  ...[payload, options]: IfMaybeUndefined<
                    P,
                    [payload?: P, options?: UndoableOptions],
                    [payload: P, options?: UndoableOptions]
                  >
                ) => ({ payload: payload as P, meta: options })
              },
            }
          ),
        }

        const createAppSlice = buildCreateSlice({
          creators: {
            historyMethods: historyMethodsCreator,
            undoable: undoableCreator,
          },
        })

        const historySlice = createAppSlice({
          name: 'history',
          initialState: getInitialHistoryState({ value: 1 }),
          reducers: (create) => ({
            ...create.historyMethods(),
            increment: create.preparedReducer(
              create.undoable.withoutPayload(),
              create.undoable((state) => {
                state.value++
              })
            ),
            incrementBy: create.preparedReducer(
              create.undoable.withPayload<number>(),
              create.undoable((state, action) => {
                state.value += action.payload
              })
            ),
          }),
          selectors: {
            selectValue: (state) => state.present.value,
          },
        })
        const {
          actions: { increment, incrementBy, undo, redo, reset },
          selectors: { selectValue },
        } = historySlice

        const store = configureStore({
          reducer: { [historySlice.reducerPath]: historySlice.reducer },
        })

        expect(selectValue(store.getState())).toBe(1)

        store.dispatch(increment())
        expect(selectValue(store.getState())).toBe(2)

        store.dispatch(undo())
        expect(selectValue(store.getState())).toBe(1)

        store.dispatch(incrementBy(3))
        expect(selectValue(store.getState())).toBe(4)

        store.dispatch(undo())
        expect(selectValue(store.getState())).toBe(1)

        store.dispatch(redo())
        expect(selectValue(store.getState())).toBe(4)

        store.dispatch(reset())
        expect(selectValue(store.getState())).toBe(1)
      })
      test('batchable', () => {
        const batchedCreator: ReducerCreator<typeof batchedCreatorType> = {
          type: batchedCreatorType,
          create: Object.assign(
            function (
              this: ReducerCreators<any>,
              reducer: CaseReducer<any, any>
            ) {
              return this.preparedReducer(prepareAutoBatched(), reducer) as any
            },
            {
              test() {
                return { _reducerDefinitionType: batchedCreatorType } as const
              },
            }
          ),
          handle() {},
        }

        const createAppSlice = buildCreateSlice({
          creators: { batchedReducer: batchedCreator },
        })
        const counterSlice = createAppSlice({
          name: 'counter',
          initialState: { value: 0 },
          reducers: (create) => ({
            increment: create.batchedReducer((state) => {
              state.value++
            }),
            incrementBy: create.batchedReducer<number>((state, { payload }) => {
              state.value += payload
            }),
          }),
        })
        const { increment, incrementBy } = counterSlice.actions
        expect(increment().meta).toEqual({ [SHOULD_AUTOBATCH]: true })
        expect(incrementBy(1).meta).toEqual({ [SHOULD_AUTOBATCH]: true })
      })
      test.skip('creators can discourage their use if state is incompatible (types only)', () => {
        const createAppSlice = buildCreateSlice({
          creators: { fetchReducers: fetchCreator },
        })

        const counterSlice = createAppSlice({
          name: 'counter',
          initialState: { value: 0 },
          reducers: (create) => ({
            // @ts-expect-error incompatible state
            ...create.fetchReducers(),
          }),
        })
      })
    })
  })
})

interface LoaderReducerDefinition<State>
  extends ReducerDefinition<typeof loaderCreatorType> {
  started?: CaseReducer<State, PayloadAction<string>>
  ended?: CaseReducer<State, PayloadAction<string>>
}

interface FetchState<T> {
  data?: T
  status: 'loading' | 'finished' | 'error'
}

interface PaginationState {
  page: number
}

interface PatchesState {
  undo: Patch[]
  redo: Patch[]
}

interface HistoryState<T> {
  past: PatchesState[]
  present: T
  future: PatchesState[]
}

interface UndoableOptions {
  undoable?: boolean
}

declare module '@reduxjs/toolkit' {
  export interface SliceReducerCreators<
    State = any,
    CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
    Name extends string = string
  > {
    [loaderCreatorType]: ReducerCreatorEntry<
      (
        reducers: Pick<LoaderReducerDefinition<State>, 'ended' | 'started'>
      ) => LoaderReducerDefinition<State>,
      {
        actions: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof loaderCreatorType
          >]: (() => ThunkAction<
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
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof loaderCreatorType
          >]: Required<
            Pick<LoaderReducerDefinition<State>, 'ended' | 'started'>
          >
        }
      }
    >
    [conditionCreatorType]: ReducerCreatorEntry<
      <Args extends any[]>(
        makePredicate: (...args: Args) => AnyListenerPredicate<unknown>
      ) => ReducerDefinition<typeof conditionCreatorType> & {
        makePredicate: (...args: Args) => AnyListenerPredicate<unknown>
      },
      {
        actions: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof conditionCreatorType
          >]: CaseReducers[ReducerName] extends {
            makePredicate: (
              ...args: infer Args
            ) => AnyListenerPredicate<unknown>
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
      }
    >
    [fetchCreatorType]: ReducerCreatorEntry<
      State extends FetchState<infer Data>
        ? (this: ReducerCreators<State>) => {
            start: CaseReducerDefinition<State, PayloadAction>
            success: CaseReducerDefinition<State, PayloadAction<Data>>
          }
        : never
    >
    [paginationCreatorType]: ReducerCreatorEntry<
      State extends PaginationState
        ? (this: ReducerCreators<State>) => {
            nextPage: CaseReducerDefinition<State, PayloadAction>
            previousPage: CaseReducerDefinition<State, PayloadAction>
            goToPage: CaseReducerDefinition<State, PayloadAction<number>>
          }
        : never
    >
    [historyMethodsCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<unknown>
        ? (this: ReducerCreators<State>) => {
            undo: CaseReducerDefinition<State, PayloadAction>
            redo: CaseReducerDefinition<State, PayloadAction>
            reset: ReducerDefinition<typeof historyMethodsCreatorType> & {
              type: 'reset'
            }
          }
        : never,
      {
        actions: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof historyMethodsCreatorType
          >]: CaseReducers[ReducerName] extends { type: 'reset' }
            ? PayloadActionCreator<void, SliceActionType<Name, ReducerName>>
            : never
        }
        caseReducers: {
          [ReducerName in ReducerNamesOfType<
            CaseReducers,
            typeof historyMethodsCreatorType
          >]: CaseReducers[ReducerName] extends { type: 'reset' }
            ? CaseReducer<State, PayloadAction>
            : never
        }
      }
    >
    [undoableCreatorType]: ReducerCreatorEntry<
      State extends HistoryState<infer Data>
        ? {
            <A extends Action & { meta?: UndoableOptions }>(
              this: ReducerCreators<State>,
              reducer: CaseReducer<Data, NoInfer<A>>
            ): CaseReducer<State, A>
            withoutPayload(): (options?: UndoableOptions) => {
              payload: undefined
              meta: UndoableOptions | undefined
            }
            withPayload<P>(): (
              ...args: IfMaybeUndefined<
                P,
                [payload?: P, options?: UndoableOptions],
                [payload: P, options?: UndoableOptions]
              >
            ) => { payload: P; meta: UndoableOptions | undefined }
          }
        : never
    >
    [batchedCreatorType]: ReducerCreatorEntry<{
      (
        this: ReducerCreators<State>,
        reducer: CaseReducer<State, PayloadAction>
      ): PreparedCaseReducerDefinition<
        State,
        () => { payload: undefined; meta: unknown }
      >
      <Payload>(
        this: ReducerCreators<State>,
        reducer: CaseReducer<State, PayloadAction<Payload>>
      ): PreparedCaseReducerDefinition<
        State,
        IfMaybeUndefined<
          Payload,
          (payload?: Payload) => { payload: Payload; meta: unknown },
          (payload: Payload) => { payload: Payload; meta: unknown }
        >
      >
      test(): ReducerDefinition<typeof batchedCreatorType>
    }>
  }
}
