import { createSlice } from './createSlice'
import { createAction, PayloadAction } from './createAction'
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

describe('createSlice', () => {
  describe('when slice is undefined', () => {
    it('should throw an error', () => {
      expect(() =>
        // @ts-ignore
        createSlice({
          reducers: {
            increment: state => state + 1,
            multiply: (state, action: PayloadAction<number>) =>
              state * action.payload
          },
          initialState: 0
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
            increment: state => state + 1,
            multiply: (state, action: PayloadAction<number>) =>
              state * action.payload
          },
          initialState: 0
        })
      ).toThrowError()
    })
  })

  describe('when passing slice', () => {
    const { actions, reducer, caseReducers } = createSlice({
      reducers: {
        increment: state => state + 1
      },
      initialState: 0,
      name: 'cool'
    })

    it('should create increment action', () => {
      expect(actions.hasOwnProperty('increment')).toBe(true)
    })

    it('should have the correct action for increment', () => {
      expect(actions.increment()).toEqual({
        type: 'cool/increment',
        payload: undefined
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
  })

  describe('when mutating state object', () => {
    const initialState = { user: '' }

    const { actions, reducer } = createSlice({
      reducers: {
        setUserName: (state, action) => {
          state.user = action.payload
        }
      },
      initialState,
      name: 'user'
    })

    it('should set the username', () => {
      expect(reducer(initialState, actions.setUserName('eric'))).toEqual({
        user: 'eric'
      })
    })
  })

  describe('when passing extra reducers', () => {
    const addMore = createAction<{ amount: number }>('ADD_MORE')

    const { reducer } = createSlice({
      name: 'test',
      reducers: {
        increment: state => state + 1,
        multiply: (state, action) => state * action.payload
      },
      extraReducers: {
        [addMore.type]: (state, action) => state + action.payload.amount
      },
      initialState: 0
    })

    it('should call extra reducers when their actions are dispatched', () => {
      const result = reducer(10, addMore({ amount: 5 }))

      expect(result).toBe(15)
    })

    describe('alternative builder callback for extraReducers', () => {
      const increment = createAction<number, 'increment'>('increment')

      test('can be used with actionCreators', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: builder =>
            builder.addCase(
              increment,
              (state, action) => state + action.payload
            )
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('can be used with string action types', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: builder =>
            builder.addCase(
              'increment',
              (state, action: { type: 'increment'; payload: number }) =>
                state + action.payload
            )
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('prevents the same action type from being specified twice', () => {
        expect(() =>
          createSlice({
            name: 'counter',
            initialState: 0,
            reducers: {},
            extraReducers: builder =>
              builder
                .addCase('increment', state => state + 1)
                .addCase('increment', state => state + 1)
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"addCase cannot be called with two reducers for the same action type"`
        )
      })

      test('can be used with addMatcher and type guard functions', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: builder =>
            builder.addMatcher(
              increment.match,
              (state, action: { type: 'increment'; payload: number }) =>
                state + action.payload
            )
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      test('can be used with addDefaultCase', () => {
        const slice = createSlice({
          name: 'counter',
          initialState: 0,
          reducers: {},
          extraReducers: builder =>
            builder.addDefaultCase((state, action) => state + action.payload)
        })
        expect(slice.reducer(0, increment(5))).toBe(5)
      })

      // for further tests, see the test of createReducer that goes way more into depth on this
    })
  })

  describe('behaviour with enhanced case reducers', () => {
    it('should pass all arguments to the prepare function', () => {
      const prepare = jest.fn((payload, somethingElse) => ({ payload }))

      const testSlice = createSlice({
        name: 'test',
        initialState: 0,
        reducers: {
          testReducer: {
            reducer: s => s,
            prepare
          }
        }
      })

      expect(testSlice.actions.testReducer('a', 1)).toEqual({
        type: 'test/testReducer',
        payload: 'a'
      })
      expect(prepare).toHaveBeenCalledWith('a', 1)
    })

    it('should call the reducer function', () => {
      const reducer = jest.fn(() => 5)

      const testSlice = createSlice({
        name: 'test',
        initialState: 0,
        reducers: {
          testReducer: {
            reducer,
            prepare: (payload: any) => ({ payload })
          }
        }
      })

      testSlice.reducer(0, testSlice.actions.testReducer('testPayload'))
      expect(reducer).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ payload: 'testPayload' })
      )
    })
  })

  describe('reducers definition with asyncThunks', () => {
    function pending(state: any[], action: any) {
      state.push(['pendingReducer', action])
    }
    function fulfilled(state: any[], action: any) {
      state.push(['fulfilledReducer', action])
    }
    function rejected(state: any[], action: any) {
      state.push(['rejectedReducer', action])
    }

    test('successful thunk', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [],
        reducers: create => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
              return Promise.resolve('resolved payload')
            },
            { pending, fulfilled, rejected }
          )
        })
      })

      const store = createStore(slice.reducer, applyMiddleware(thunk))
      // @ts-ignore
      await store.dispatch(slice.actions.thunkReducers('test'))
      expect(store.getState()).toMatchObject([
        [
          'pendingReducer',
          {
            type: 'test/thunkReducers/pending',
            payload: undefined
          }
        ],
        [
          'fulfilledReducer',
          {
            type: 'test/thunkReducers/fulfilled',
            payload: 'resolved payload'
          }
        ]
      ])
    })

    test('rejected thunk', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [],
        reducers: create => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
              throw new Error('')
            },
            { pending, fulfilled, rejected }
          )
        })
      })

      const store = createStore(slice.reducer, applyMiddleware(thunk))
      // @ts-ignore
      await store.dispatch(slice.actions.thunkReducers('test'))
      expect(store.getState()).toMatchObject([
        [
          'pendingReducer',
          {
            type: 'test/thunkReducers/pending',
            payload: undefined
          }
        ],
        [
          'rejectedReducer',
          {
            type: 'test/thunkReducers/rejected',
            payload: undefined
          }
        ]
      ])
    })

    test('with options', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [],
        reducers: create => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
              return 'should not call this'
            },
            {
              options: {
                condition() {
                  return false
                },
                dispatchConditionRejection: true
              },
              pending,
              fulfilled,
              rejected
            }
          )
        })
      })

      const store = createStore(slice.reducer, applyMiddleware(thunk))
      // @ts-ignore
      await store.dispatch(slice.actions.thunkReducers('test'))
      expect(store.getState()).toMatchObject([
        [
          'rejectedReducer',
          {
            type: 'test/thunkReducers/rejected',
            payload: undefined,
            meta: { condition: true }
          }
        ]
      ])
    })

    test('has caseReducers for the asyncThunk', async () => {
      const slice = createSlice({
        name: 'test',
        initialState: [],
        reducers: create => ({
          thunkReducers: create.asyncThunk(
            function payloadCreator(arg, api) {
              return Promise.resolve('resolved payload')
            },
            { pending, fulfilled }
          )
        })
      })

      expect(slice.caseReducers.thunkReducers.pending).toBe(pending)
      expect(slice.caseReducers.thunkReducers.fulfilled).toBe(fulfilled)
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
  })
})
