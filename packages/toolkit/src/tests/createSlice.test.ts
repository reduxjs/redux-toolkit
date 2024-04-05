import { vi } from 'vitest'
import type { Draft, Patch } from 'immer'
import { applyPatches, enablePatches, produceWithPatches } from 'immer'
import type {
  Action,
  CaseReducer,
  CaseReducerDefinition,
  CreatorCaseReducers,
  PayloadAction,
  PayloadActionCreator,
  ReducerCreator,
  ReducerCreatorEntry,
  ReducerCreators,
  ReducerDefinition,
  ReducerDetails,
  ReducerHandlingContext,
  SliceActionType,
  ThunkAction,
  WithSlice,
} from '@reduxjs/toolkit'
import {
  buildCreateSlice,
  combineSlices,
  configureStore,
  createAction,
  createNextState,
  createSlice,
  isAnyOf,
  nanoid,
  preparedReducerCreator,
  reducerCreator,
} from '@reduxjs/toolkit'
import {
  createConsole,
  getLog,
  mockConsole,
} from 'console-testing-library/pure'
import type { IfMaybeUndefined, NoInfer } from '../tsHelpers'
enablePatches()

type CreateSlice = typeof createSlice

const loaderCreatorType = Symbol('loaderCreatorType')
const historyMethodsCreatorType = Symbol('historyMethodsCreatorType')
const undoableCreatorType = Symbol('undoableCreatorType')
const patchCreatorType = Symbol('patchCreatorType')

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

      return vi.unstubAllEnvs
    })

    it('should throw an error', () => {
      createSlice({
        name: 'test',
        reducers: {},
        initialState: undefined,
      })

      expect(getLog().log).toBe(
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
      extraReducers: (builder) => {
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
          extraReducers: (builder) =>
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
            extraReducers: (builder) =>
              builder
                .addCase('increment', (state) => state + 1)
                .addCase('increment', (state) => state + 1),
          })
          slice.reducer(undefined, { type: 'unrelated' })
        }).toThrowErrorMatchingInlineSnapshot(
          `[Error: \`builder.addCase\` cannot be called with two reducers for the same action type 'increment']`,
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
          extraReducers: (builder) =>
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
        expect.objectContaining({ payload: 'testPayload' }),
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
        /The object notation for `createSlice.extraReducers` has been removed/,
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
        /The object notation for `createSlice.extraReducers` has been removed/,
      )
    })

    // TODO Determine final production behavior here
    it.todo('Crashes in production', () => {
      vi.stubEnv('NODE_ENV', 'production')

      const { createSlice } = require('../createSlice')

      const dummySlice = (createSlice as CreateSlice)({
        name: 'dummy',
        initialState: [],
        reducers: {},
        // @ts-ignore
        extraReducers: {},
      })
      const wrapper = () => {
        const { reducer } = dummySlice
        reducer(undefined, { type: 'dummy' })
      }

      expect(wrapper).toThrowError(
        /The object notation for `createSlice.extraReducers` has been removed/,
      )

      vi.unstubAllEnvs()
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
        `[Error: selectState returned undefined for an uninjected slice reducer]`,
      )

      const injected2 = slice.injectInto(combinedReducer, {
        reducerPath: 'other',
      })

      // can use same cache for localised selectors
      expect(injected.getSelectors()).toBe(injected2.getSelectors())
      // these should be different
      expect(injected.selectors).not.toBe(injected2.selectors)
    })
  })
  test('reducer and preparedReducer creators can be invoked for object syntax', () => {
    const counterSlice = createSlice({
      name: 'counter',
      initialState: 0,
      reducers: {
        incrementBy: reducerCreator.create<number>(
          (state, action) => state + action.payload,
        ),
        decrementBy: preparedReducerCreator.create(
          (amount: number) => ({
            payload: amount,
          }),
          (state, action) => state - action.payload,
        ),
      },
    })

    const { incrementBy, decrementBy } = counterSlice.actions
    expect(counterSlice.reducer(0, incrementBy(1))).toBe(1)
    expect(counterSlice.reducer(0, decrementBy(3))).toBe(-3)
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

        context.exposeAction(thunkCreator)
        context.exposeCaseReducer({ started, ended })
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

    describe('creators can return multiple definitions to be spread, or something else entirely', () => {
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
            context,
          )
        },
      }

      const undoableCreator: ReducerCreator<typeof undoableCreatorType> = {
        type: undoableCreatorType,
        create: Object.assign(
          function makeUndoable<A extends Action & { meta?: UndoableOptions }>(
            reducer: CaseReducer<any, A>,
          ): CaseReducer<HistoryState<any>, A> {
            return (state, action) => {
              const [nextState, redoPatch, undoPatch] = produceWithPatches(
                state,
                (draft) => {
                  const result = reducer(draft.present, action)
                  if (typeof result !== 'undefined') {
                    draft.present = result
                  }
                },
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
          },
        ),
      }

      const createAppSlice = buildCreateSlice({
        creators: {
          historyMethods: historyMethodsCreator,
          undoable: undoableCreator,
        },
      })
      test('history slice', () => {
        const historySlice = createAppSlice({
          name: 'history',
          initialState: getInitialHistoryState({ value: 1 }),
          reducers: (create) => ({
            ...create.historyMethods(),
            increment: create.preparedReducer(
              create.undoable.withoutPayload(),
              create.undoable((state) => {
                state.value++
              }),
            ),
            incrementBy: create.preparedReducer(
              create.undoable.withPayload<number>(),
              create.undoable((state, action) => {
                state.value += action.payload
              }),
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
    })
    describe('context methods throw errors if used incorrectly', () => {
      const makeSliceWithHandler = (
        handle: ReducerCreator<typeof loaderCreatorType>['handle'],
      ) => {
        const createAppSlice = buildCreateSlice({
          creators: {
            loader: {
              type: loaderCreatorType,
              create(reducers) {
                return {
                  _reducerDefinitionType: loaderCreatorType,
                  ...reducers,
                }
              },
              handle,
            } satisfies ReducerCreator<typeof loaderCreatorType>,
          },
        })
        return createAppSlice({
          name: 'loader',
          initialState: {} as Partial<Record<string, true>>,
          reducers: (create) => ({
            addLoader: create.loader({}),
          }),
        })
      }
      test('context.addCase throws if called twice for same type', () => {
        expect(() =>
          makeSliceWithHandler((_details, _def, context) => {
            context.addCase('foo', () => {}).addCase('foo', () => {})
          }),
        ).toThrowErrorMatchingInlineSnapshot(
          `[Error: \`context.addCase\` cannot be called with two reducers for the same action type: foo]`,
        )
      })
      test('context.addCase throws if empty action type', () => {
        expect(() =>
          makeSliceWithHandler((_details, _def, context) => {
            context.addCase('', () => {})
          }),
        ).toThrowErrorMatchingInlineSnapshot(
          `[Error: \`context.addCase\` cannot be called with an empty action type]`,
        )
      })
      test('context.exposeAction throws if called twice for same reducer name', () => {
        expect(() =>
          makeSliceWithHandler((_details, _def, context) => {
            context.exposeAction(() => {}).exposeAction(() => {})
          }),
        ).toThrowErrorMatchingInlineSnapshot(
          `[Error: context.exposeAction cannot be called twice for the same reducer definition: addLoader]`,
        )
      })
      test('context.exposeCaseReducer throws if called twice for same reducer name', () => {
        expect(() =>
          makeSliceWithHandler((_details, _def, context) => {
            context.exposeCaseReducer({}).exposeCaseReducer({})
          }),
        ).toThrowErrorMatchingInlineSnapshot(
          `[Error: context.exposeCaseReducer cannot be called twice for the same reducer definition: addLoader]`,
        )
      })
      test('context.selectSlice throws if unable to find slice state', () => {
        const patchCreator: ReducerCreator<typeof patchCreatorType> = {
          type: patchCreatorType,
          create() {
            return { _reducerDefinitionType: patchCreatorType }
          },
          handle({ type }, _def, context) {
            const patchedAction = createAction<Patch[]>(type)
            function patchThunk(
              recipe: (draft: Draft<any>) => void,
            ): ThunkAction<void, Record<string, any>, unknown, Action> {
              return (dispatch, getState) => {
                const [, patches] = produceWithPatches(
                  context.selectSlice(getState()),
                  recipe,
                )
                dispatch(patchedAction(patches))
              }
            }
            Object.assign(patchThunk, { patched: patchedAction })

            function applyPatchesReducer(
              state: Objectish,
              action: PayloadAction<Patch[]>,
            ) {
              return applyPatches(state, action.payload)
            }

            ;(context as ReducerHandlingContext<Objectish>)
              .addCase(patchedAction, applyPatchesReducer)
              .exposeAction(patchThunk)
              .exposeCaseReducer(applyPatchesReducer)
          },
        }

        const createAppSlice = buildCreateSlice({
          creators: { patcher: patchCreator },
        })

        const personSlice = createAppSlice({
          name: 'person',
          initialState: { name: 'Alice' },
          reducers: (create) => ({
            patchPerson: create.patcher(),
          }),
        })

        const { patchPerson } = personSlice.actions

        const correctStore = configureStore({
          reducer: combineSlices(personSlice),
        })

        expect(correctStore.getState().person.name).toBe('Alice')

        expect(() =>
          correctStore.dispatch(
            patchPerson((person) => {
              person.name = 'Bob'
            }),
          ),
        ).not.toThrow()

        expect(correctStore.getState().person.name).toBe('Bob')

        const incorrectStore = configureStore({
          reducer: {
            somewhere: personSlice.reducer,
          },
        })

        expect(() =>
          incorrectStore.dispatch(
            // @ts-expect-error state mismatch
            patchPerson((person) => {
              person.name = 'Charlie'
            }),
          ),
        ).toThrowErrorMatchingInlineSnapshot(`[Error: Could not find "person" slice in state. In order for slice creators to use \`context.selectSlice\`, the slice must be nested in the state under its reducerPath: "person"]`)
      })
    })
  })
})

interface LoaderReducerDefinition<State>
  extends ReducerDefinition<typeof loaderCreatorType> {
  started?: CaseReducer<State, PayloadAction<string>>
  ended?: CaseReducer<State, PayloadAction<string>>
}

interface LoaderThunk<Name extends string, ReducerName extends PropertyKey> {
  (): ThunkAction<
    { loaderId: string; end: () => void },
    unknown,
    unknown,
    Action
  >
  started: PayloadActionCreator<
    string,
    `${SliceActionType<Name, ReducerName>}/started`
  >
  ended: PayloadActionCreator<
    string,
    `${SliceActionType<Name, ReducerName>}/ended`
  >
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

// nicked from immer
type Objectish = AnyObject | AnyArray | AnyMap | AnySet
type AnyObject = {
  [key: string]: any
}
type AnyArray = Array<any>
type AnySet = Set<any>
type AnyMap = Map<any, any>

type PatchThunk<
  Name extends string,
  ReducerName extends PropertyKey,
  ReducerPath extends string,
  State,
> = {
  (
    recipe: (draft: Draft<State>) => void,
  ): ThunkAction<void, Record<ReducerPath, State>, unknown, Action>
  patched: PayloadActionCreator<Patch[], SliceActionType<Name, ReducerName>>
}

declare module '@reduxjs/toolkit' {
  export interface SliceReducerCreators<
    State,
    CaseReducers extends CreatorCaseReducers<State>,
    Name extends string,
    ReducerPath extends string,
  > {
    [loaderCreatorType]: ReducerCreatorEntry<
      (
        reducers: Pick<LoaderReducerDefinition<State>, 'ended' | 'started'>,
      ) => LoaderReducerDefinition<State>,
      {
        actions: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof loaderCreatorType
          >
            ? LoaderThunk<Name, ReducerName>
            : never
        }
        caseReducers: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof loaderCreatorType
          >
            ? Required<
                Pick<LoaderReducerDefinition<State>, 'ended' | 'started'>
              >
            : never
        }
      }
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
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof historyMethodsCreatorType
          > & { type: 'reset' }
            ? PayloadActionCreator<void, SliceActionType<Name, ReducerName>>
            : never
        }
        caseReducers: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof historyMethodsCreatorType
          > & { type: 'reset' }
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
              reducer: CaseReducer<Data, NoInfer<A>>,
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
    [patchCreatorType]: ReducerCreatorEntry<
      State extends Objectish
        ? () => ReducerDefinition<typeof patchCreatorType>
        : never,
      {
        actions: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof patchCreatorType
          >
            ? PatchThunk<Name, ReducerName, ReducerPath, State>
            : never
        }
        caseReducers: {
          [ReducerName in keyof CaseReducers]: CaseReducers[ReducerName] extends ReducerDefinition<
            typeof patchCreatorType
          >
            ? CaseReducer<State, PayloadAction<Patch[]>>
            : never
        }
      }
    >
  }
}
