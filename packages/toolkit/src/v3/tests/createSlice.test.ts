import { configureStore } from '../../configureStore'
import { createAction } from '../../createAction'
import type { PayloadAction } from '../../createAction'
import { asyncThunkCreator, resetCreator } from '../creators'
import { createSlice } from '../createSlice'

interface Todo {
  id: number
  text: string
}

describe('createSlice v3', () => {
  describe('object form', () => {
    const makeSlice = () =>
      createSlice({
        name: 'todos',
        initialState: { list: [] as Todo[], lastAdded: '' },
        reducers: {
          added(state, action: PayloadAction<Todo>) {
            state.list.push(action.payload)
            state.lastAdded = action.payload.text
          },
          cleared(state) {
            state.list = []
          },
          addedWithPrepare: {
            prepare(text: string) {
              return { payload: { id: 99, text } }
            },
            reducer(state, action: PayloadAction<Todo>) {
              state.list.push(action.payload)
            },
          },
        },
      })

    it('creates actions with `${name}/${key}` types', () => {
      const slice = makeSlice()
      expect(slice.actions.added({ id: 1, text: 'a' })).toEqual({
        type: 'todos/added',
        payload: { id: 1, text: 'a' },
      })
      expect(slice.actions.cleared()).toEqual({
        type: 'todos/cleared',
        payload: undefined,
      })
      expect(slice.actions.addedWithPrepare('b')).toEqual({
        type: 'todos/addedWithPrepare',
        payload: { id: 99, text: 'b' },
      })
    })

    it('handles actions immutably via Immer', () => {
      const slice = makeSlice()
      const initial = slice.getInitialState()
      const next = slice.reducer(initial, slice.actions.added({ id: 1, text: 'a' }))
      expect(next.list).toEqual([{ id: 1, text: 'a' }])
      expect(initial.list).toEqual([])
    })

    it('exposes the exact user case reducer functions', () => {
      const added = (state: { list: Todo[] }, action: PayloadAction<Todo>) => {
        state.list.push(action.payload)
      }
      const slice = createSlice({
        name: 'todos',
        initialState: { list: [] as Todo[] },
        reducers: { added },
      })
      expect(slice.caseReducers.added).toBe(added)
    })
  })

  describe('eager validation', () => {
    // These verify *runtime* validation; the same shapes are rejected at the
    // type level too (see createSlice.test-d.ts), hence the `as any` casts.
    it('throws at call time when the removed `extraReducers` option is passed', () => {
      expect(() =>
        createSlice({
          name: 'todos',
          initialState: {},
          reducers: {},
          extraReducers: {},
        } as any),
      ).toThrowError(/`extraReducers` option was renamed to `respondTo`/)
    })

    it('throws at call time when respondTo is not a function', () => {
      expect(() =>
        createSlice({
          name: 'todos',
          initialState: {},
          reducers: {},
          respondTo: { some: 'object' },
        } as any),
      ).toThrowError(/`respondTo` must be a builder callback/)
    })

    it('throws at call time when name is missing', () => {
      expect(() =>
        createSlice({ initialState: {}, reducers: {} } as any),
      ).toThrowError(/`name` is a required option/)
    })

    it('throws at call time when creators is combined with object-form reducers', () => {
      expect(() =>
        createSlice({
          name: 'todos',
          initialState: {},
          creators: () => ({}),
          reducers: {},
        } as any),
      ).toThrowError(/`creators` option requires the callback form/)
    })
  })

  describe('respondTo', () => {
    const external = createAction<number>('external/count')

    it('handles external actions', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {
          increment(state) {
            state.value += 1
          },
        },
        respondTo: (builder) => {
          builder.addCase(external, (state, action) => {
            state.value += action.payload
          })
        },
      })
      let state = slice.getInitialState()
      state = slice.reducer(state, slice.actions.increment())
      state = slice.reducer(state, external(41))
      expect(state.value).toBe(42)
    })

    it('supports matchers and default case', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: { matched: 0, defaulted: 0 },
        reducers: {},
        respondTo: (builder) => {
          builder
            .addMatcher(
              (action): action is PayloadAction<number> =>
                action.type.startsWith('m/'),
              (state) => {
                state.matched += 1
              },
            )
            .addDefaultCase((state) => {
              state.defaulted += 1
            })
        },
      })
      let state = slice.getInitialState()
      state = slice.reducer(state, { type: 'm/one' })
      state = slice.reducer(state, { type: 'other' })
      // the matcher suppresses the default case for 'm/one'
      expect(state).toEqual({ matched: 1, defaulted: 1 })
    })

    it('allows circular references between slices via lazy building', () => {
      // sliceA's respondTo references sliceB's actions, which do not exist
      // yet when sliceA is created. This is the E3 pattern that must keep working.
      const sliceA = createSlice({
        name: 'a',
        initialState: { count: 0 },
        reducers: {},
        respondTo: (builder) => {
          builder.addCase(sliceB.actions.pinged, (state) => {
            state.count += 1
          })
        },
      })
      const sliceB = createSlice({
        name: 'b',
        initialState: {},
        reducers: { pinged() {} },
      })

      const next = sliceA.reducer(sliceA.getInitialState(), sliceB.actions.pinged())
      expect(next.count).toBe(1)
    })

    it('errors when reducers and respondTo handle the same action type', () => {
      const slice = createSlice({
        name: 'todos',
        initialState: {},
        reducers: { added() {} },
        respondTo: (builder) => {
          builder.addCase('todos/added', () => {})
        },
      })
      expect(() =>
        slice.reducer(undefined, { type: 'anything' }),
      ).toThrowError(/handled by both `reducers` and `respondTo`/)
    })
  })

  describe('callback form', () => {
    it('supports builtin reducer and preparedReducer creators without a creators option', () => {
      const slice = createSlice({
        name: 'todos',
        initialState: { list: [] as string[] },
        reducers: (create) => ({
          added: create.reducer<string>((state, action) => {
            state.list.push(action.payload)
          }),
          addedTwice: create.preparedReducer(
            (text: string) => ({ payload: `${text}${text}` }),
            (state, action) => {
              state.list.push(action.payload)
            },
          ),
        }),
      })

      let state = slice.getInitialState()
      state = slice.reducer(state, slice.actions.added('a'))
      state = slice.reducer(state, slice.actions.addedTwice('b'))
      expect(state.list).toEqual(['a', 'bb'])
      expect(slice.actions.added('x').type).toBe('todos/added')
    })

    it('exposes the exact user function for create.reducer (no wrapping)', () => {
      const fn = (state: string[], action: PayloadAction<string>) => {
        state.push(action.payload)
      }
      const slice = createSlice({
        name: 'todos',
        initialState: [] as string[],
        reducers: (create) => ({ added: create.reducer<string>(fn) }),
      })
      expect(slice.caseReducers.added).toBe(fn)
    })

    it('supports the asyncThunk creator via the creators option', async () => {
      const slice = createSlice({
        name: 'users',
        initialState: {
          status: 'idle' as 'idle' | 'pending' | 'done' | 'error',
          user: '',
          settledCount: 0,
        },
        creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
        reducers: (create) => ({
          fetchUser: create.asyncThunk(
            async (id: number) => {
              if (id < 0) throw new Error('bad id')
              return `user-${id}`
            },
            {
              pending(state) {
                state.status = 'pending'
              },
              fulfilled(state, action) {
                state.status = 'done'
                state.user = action.payload
              },
              rejected(state) {
                state.status = 'error'
              },
              settled(state) {
                state.settledCount += 1
              },
            },
          ),
        }),
      })

      expect(slice.actions.fetchUser.pending.type).toBe(
        'users/fetchUser/pending',
      )

      const store = configureStore({ reducer: { users: slice.reducer } })
      await store.dispatch(slice.actions.fetchUser(5))
      expect(store.getState().users).toEqual({
        status: 'done',
        user: 'user-5',
        settledCount: 1,
      })
      await store.dispatch(slice.actions.fetchUser(-1))
      expect(store.getState().users.status).toBe('error')
      expect(store.getState().users.settledCount).toBe(2)
    })

    it('supports custom creators', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: () => ({ value: 10 }),
        creators: (ctx) => ({ reset: resetCreator(ctx) }),
        reducers: (create) => ({
          incremented: create.reducer((state) => {
            state.value += 1
          }),
          reset: create.reset(),
        }),
      })

      let state = slice.getInitialState()
      state = slice.reducer(state, slice.actions.incremented())
      state = slice.reducer(state, slice.actions.incremented())
      expect(state.value).toBe(12)
      state = slice.reducer(state, slice.actions.reset())
      expect(state.value).toBe(10)
      expect(slice.actions.reset().type).toBe('counter/reset')
    })
  })

  describe('slice.reducer', () => {
    it('exposes getInitialState on the reducer itself', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: { value: 0 },
        reducers: {},
      })
      // Permanently `undefined` in 2.x (INV-CS-097)
      expect(slice.reducer.getInitialState()).toEqual({ value: 0 })
    })

    it('has a stable identity across calls', () => {
      const slice = createSlice({
        name: 'counter',
        initialState: 0,
        reducers: {},
      })
      const ref = slice.reducer
      slice.reducer(undefined, { type: 'x' })
      expect(slice.reducer).toBe(ref)
    })
  })

  describe('selectors', () => {
    const makeSlice = () =>
      createSlice({
        name: 'todos',
        initialState: { list: ['a', 'b'] },
        reducers: {},
        selectors: {
          selectCount: (state) => state.list.length,
          selectNth: (state, n: number) => state.list[n],
        },
      })

    it('wraps selectors to accept root state', () => {
      const slice = makeSlice()
      const rootState = { todos: slice.getInitialState() }
      expect(slice.selectors.selectCount(rootState)).toBe(2)
      expect(slice.selectors.selectNth(rootState, 1)).toBe('b')
    })

    it('exposes the original via .unwrapped', () => {
      const slice = makeSlice()
      expect(slice.selectors.selectCount.unwrapped({ list: [] })).toBe(0)
    })

    it('throws on missing slice state, in every mode', () => {
      const slice = makeSlice()
      expect(() =>
        slice.selectors.selectCount({} as { todos: { list: string[] } }),
      ).toThrowError(/root state does not contain a "todos" key/)
    })

    it('getSelectors accepts a custom selectState', () => {
      const slice = makeSlice()
      const nested = { deep: { todos: slice.getInitialState() } }
      const selectors = slice.getSelectors(
        (root: typeof nested) => root.deep.todos,
      )
      expect(selectors.selectCount(nested)).toBe(2)
    })

    it('respects reducerPath', () => {
      const slice = createSlice({
        name: 'todos',
        reducerPath: 'todoState',
        initialState: { list: [] as string[] },
        reducers: {},
        selectors: { selectList: (state) => state.list },
      })
      expect(slice.reducerPath).toBe('todoState')
      expect(slice.selectors.selectList({ todoState: { list: ['x'] } })).toEqual(
        ['x'],
      )
    })
  })
})
