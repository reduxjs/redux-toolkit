import {
  asyncThunkCreator,
  buildCreateSlice,
  createSlice,
  configureStore,
} from '@reduxjs/toolkit'

describe('asyncThunkCreator', () => {
  describe('reducers definition with asyncThunks', () => {
    it('is disabled by default', () => {
      expect(() =>
        createSlice({
          name: 'test',
          initialState: [] as any[],
          // @ts-expect-error asyncThunk not in creators
          reducers: (create) => ({ thunk: create.asyncThunk(() => {}) }),
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[TypeError: create.asyncThunk is not a function]`,
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
            { pending, fulfilled, rejected, settled },
          ),
        }),
      })

      const store = configureStore({
        reducer: slice.reducer,
      })
      await store.dispatch(slice.actions.thunkReducers())
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
            { pending, fulfilled, rejected, settled },
          ),
        }),
      })

      const store = configureStore({
        reducer: slice.reducer,
      })
      await store.dispatch(slice.actions.thunkReducers())
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
            },
          ),
        }),
      })

      const store = configureStore({
        reducer: slice.reducer,
      })
      await store.dispatch(slice.actions.thunkReducers())
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

    test('throws an error when invoked with a normal `prepare` object that has not gone through a `create.preparedReducer` call', async () => {
      expect(() =>
        createSlice({
          name: 'test',
          initialState: [] as any[],
          // @ts-expect-error
          reducers: (create) => ({
            prepared: {
              prepare: (p: string, m: number, e: { message: string }) => ({
                payload: p,
                meta: m,
                error: e,
              }),
              reducer: (state: any[], action: any) => {
                state.push(action)
              },
            },
          }),
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Please use reducer creators passed to callback. Each reducer definition must have a \`_reducerDefinitionType\` property indicating which handler to use.]`,
      )
    })
  })
})
