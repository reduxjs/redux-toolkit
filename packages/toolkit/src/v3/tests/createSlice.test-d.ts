import type { UnknownAction } from 'redux'
import type {
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
  PayloadAction,
} from '../../createAction'
import type { AsyncThunk } from '../../createAsyncThunk'
import type { CaseReducer } from '../../createReducer'
import { asyncThunkCreator, resetCreator } from '../creators'
import { createSlice } from '../createSlice'

interface Todo {
  id: number
  text: string
}

describe('createSlice v3 types', () => {
  test('object form: action creator types', () => {
    const slice = createSlice({
      name: 'todos',
      initialState: { list: [] as Todo[] },
      reducers: {
        added(state, action: PayloadAction<Todo>) {
          state.list.push(action.payload)
        },
        cleared(state) {
          state.list = []
        },
        addedWithPrepare: {
          prepare(text: string, id: number) {
            return { payload: { id, text } }
          },
          reducer(state, action: PayloadAction<Todo>) {
            state.list.push(action.payload)
          },
        },
      },
    })

    expectTypeOf(slice.actions.added).toEqualTypeOf<
      ActionCreatorWithPayload<Todo, 'todos/added'>
    >()
    expectTypeOf(slice.actions.cleared).toEqualTypeOf<
      ActionCreatorWithoutPayload<'todos/cleared'>
    >()

    // literal action types flow through
    expectTypeOf(slice.actions.added({ id: 1, text: 'x' }).type).toEqualTypeOf<
      'todos/added'
    >()

    // prepared action creator takes prepare's args, returns prepare's payload
    expectTypeOf(slice.actions.addedWithPrepare)
      .parameters.toEqualTypeOf<[text: string, id: number]>()
    expectTypeOf(
      slice.actions.addedWithPrepare('x', 1).payload,
    ).toEqualTypeOf<Todo>()

    // state is contextually typed inside case reducers (checked implicitly
    // by the state.list accesses above compiling)

    // @ts-expect-error wrong payload type rejected
    slice.actions.added('not a todo')
    // @ts-expect-error cleared takes no payload
    slice.actions.cleared('x')
  })

  test('object form: caseReducers expose the user function types', () => {
    const slice = createSlice({
      name: 'todos',
      initialState: { list: [] as Todo[] },
      reducers: {
        added(state, action: PayloadAction<Todo>) {
          state.list.push(action.payload)
        },
      },
    })
    expectTypeOf(slice.caseReducers.added).parameters.toMatchTypeOf<
      [unknown, PayloadAction<Todo>]
    >()
  })

  test('callback form: builtin creators', () => {
    const slice = createSlice({
      name: 'todos',
      initialState: { list: [] as string[] },
      reducers: (create) => ({
        added: create.reducer<string>((state, action) => {
          expectTypeOf(state.list).toEqualTypeOf<string[]>()
          expectTypeOf(action.payload).toEqualTypeOf<string>()
        }),
        cleared: create.reducer((state) => {
          state.list = []
        }),
        addedPrepared: create.preparedReducer(
          (text: string) => ({ payload: text.length }),
          (state, action) => {
            expectTypeOf(action.payload).toEqualTypeOf<number>()
          },
        ),
      }),
    })

    expectTypeOf(slice.actions.added).toEqualTypeOf<
      ActionCreatorWithPayload<string, 'todos/added'>
    >()
    expectTypeOf(slice.actions.cleared).toEqualTypeOf<
      ActionCreatorWithoutPayload<'todos/cleared'>
    >()
    expectTypeOf(slice.actions.addedPrepared)
      .parameters.toEqualTypeOf<[text: string]>()
    expectTypeOf(
      slice.actions.addedPrepared('abc').payload,
    ).toEqualTypeOf<number>()

    expectTypeOf(slice.caseReducers.added).toEqualTypeOf<
      CaseReducer<{ list: string[] }, PayloadAction<string>>
    >()
  })

  test('callback form: no creators option means builtins only', () => {
    createSlice({
      name: 'todos',
      initialState: 0,
      reducers: (create) => ({
        inc: create.reducer((state) => state + 1),
        // @ts-expect-error asyncThunk is not available without a creators option
        bad: create.asyncThunk(async () => 1),
      }),
    })
  })

  test('asyncThunk creator: full inference through the creators option', () => {
    const slice = createSlice({
      name: 'users',
      initialState: { user: '', status: 'idle' },
      creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) }),
      reducers: (create) => ({
        fetchUser: create.asyncThunk(
          async (id: number) => `user-${id}`,
          {
            fulfilled(state, action) {
              expectTypeOf(state.user).toEqualTypeOf<string>()
              // Returned flows into the handler
              expectTypeOf(action.payload).toEqualTypeOf<string>()
              // ThunkArg flows into action.meta
              expectTypeOf(action.meta.arg).toEqualTypeOf<number>()
            },
            pending(state, action) {
              expectTypeOf(action.meta.arg).toEqualTypeOf<number>()
            },
          },
        ),
      }),
    })

    // the exposed action is the thunk itself
    expectTypeOf(slice.actions.fetchUser).toMatchTypeOf<
      AsyncThunk<string, number, {}>
    >()
    expectTypeOf(slice.actions.fetchUser.fulfilled.match).toBeFunction()

    // @ts-expect-error thunk arg must be a number
    slice.actions.fetchUser('nope')
  })

  test('custom creators expose their declared types', () => {
    const slice = createSlice({
      name: 'counter',
      initialState: { value: 0 },
      creators: (ctx) => ({ reset: resetCreator(ctx) }),
      reducers: (create) => ({
        incremented: create.reducer((state) => {
          state.value += 1
        }),
        reset: create.reset(),
      }),
    })

    expectTypeOf(slice.actions.reset).toEqualTypeOf<
      ActionCreatorWithoutPayload<'counter/reset'>
    >()
  })

  test('respondTo: builder state is the draft, cases fully typed', () => {
    createSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
      respondTo: (builder) => {
        // same as 2.x: string-typed addCase needs the literal type in the
        // action annotation for A to satisfy its Action<Type> constraint
        builder.addCase(
          'external/set',
          (state, action: PayloadAction<number, 'external/set'>) => {
            expectTypeOf(state.value).toEqualTypeOf<number>()
            state.value = action.payload
          },
        )
      },
    })

    createSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
      // @ts-expect-error respondTo must be a builder callback, not an object
      respondTo: { 'external/set': () => {} },
    })

    // @ts-expect-error the removed extraReducers option is rejected
    createSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
      extraReducers: (builder: unknown) => {},
    })
  })

  test('slice.reducer and getInitialState types', () => {
    const slice = createSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {},
    })
    expectTypeOf(slice.reducer).toMatchTypeOf<
      (
        state: { value: number } | undefined,
        action: UnknownAction,
      ) => { value: number }
    >()
    expectTypeOf(slice.reducer.getInitialState()).toEqualTypeOf<{
      value: number
    }>()
    expectTypeOf(slice.getInitialState()).toEqualTypeOf<{ value: number }>()
    expectTypeOf(slice.name).toEqualTypeOf<'counter'>()
  })

  test('selectors: wrapped signatures and unwrapped originals', () => {
    const slice = createSlice({
      name: 'todos',
      initialState: { list: [] as string[] },
      reducers: {},
      selectors: {
        selectCount: (state) => state.list.length,
        selectNth: (state, n: number) => state.list[n],
      },
    })

    expectTypeOf(
      slice.selectors.selectCount({ todos: { list: [] } }),
    ).toEqualTypeOf<number>()
    expectTypeOf(slice.selectors.selectNth)
      .parameter(1)
      .toEqualTypeOf<number>()
    expectTypeOf(
      slice.selectors.selectCount.unwrapped({ list: [] }),
    ).toEqualTypeOf<number>()
    expectTypeOf(slice.selectSlice({ todos: { list: [] } })).toEqualTypeOf<{
      list: string[]
    }>()

    // custom selectState retypes the root state
    const selectors = slice.getSelectors(
      (root: { nested: { list: string[] } }) => root.nested,
    )
    expectTypeOf(selectors.selectCount)
      .parameter(0)
      .toEqualTypeOf<{ nested: { list: string[] } }>()

    // @ts-expect-error root state must contain the slice at reducerPath
    slice.selectors.selectCount({ wrong: { list: [] } })
  })

  test('reducerPath changes selectSlice root state', () => {
    const slice = createSlice({
      name: 'todos',
      reducerPath: 'todoState',
      initialState: 0,
      reducers: {},
    })
    expectTypeOf(slice.reducerPath).toEqualTypeOf<'todoState'>()
    expectTypeOf(slice.selectSlice).parameter(0).toEqualTypeOf<{
      todoState: number
    }>()
  })
})
