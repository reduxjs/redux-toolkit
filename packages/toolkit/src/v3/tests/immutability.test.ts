import { configureStore } from '../../configureStore'
import type { PayloadAction } from '../../createAction'
import {
  buildCreateReducer,
  buildCreateSlice,
  createReducer,
  createSlice,
} from '../index'
import { noopAdapter } from '../immutability'
import { immerAdapter } from '../immerAdapter'
import { mutativeAdapter } from '../mutativeAdapter'
import type { ImmutabilityAdapter } from '../immutability'

interface TodoState {
  todos: { text: string; done: boolean }[]
  meta: { count: number }
}

const initialState: TodoState = {
  todos: [{ text: 'first', done: false }],
  meta: { count: 1 },
}

const getInitialState = (): TodoState => ({
  todos: [{ text: 'first', done: false }],
  meta: { count: 1 },
})

describe.each([
  ['immerAdapter', immerAdapter],
  ['mutativeAdapter', mutativeAdapter],
] as [string, ImmutabilityAdapter][])(
  'drafting adapters: %s',
  (_name, adapter) => {
    const makeSlice = () =>
      createSlice({
        name: 'todos',
        initialState: getInitialState(),
        immutability: adapter,
        reducers: {
          addedViaMutation(state, action: PayloadAction<string>) {
            state.todos.push({ text: action.payload, done: false })
            state.meta.count++
          },
          replacedViaReturn(state, action: PayloadAction<string>) {
            return {
              todos: [{ text: action.payload, done: false }],
              meta: { count: 1 },
            }
          },
          clearedKeepingMeta(state) {
            // returns an object that still references part of the draft,
            // exercising nested-draft finalization
            return { todos: [], meta: state.meta }
          },
        },
      })

    it('supports mutation-style case reducers without mutating the base', () => {
      const slice = makeSlice()
      const base = slice.getInitialState()
      const next = slice.reducer(base, slice.actions.addedViaMutation('second'))

      expect(next).not.toBe(base)
      expect(next.todos).toHaveLength(2)
      expect(next.todos[1]).toEqual({ text: 'second', done: false })
      expect(next.meta.count).toBe(2)
      expect(base.todos).toHaveLength(1)
      expect(base.meta.count).toBe(1)
    })

    it('supports return-style case reducers', () => {
      const slice = makeSlice()
      const base = slice.getInitialState()
      const next = slice.reducer(
        base,
        slice.actions.replacedViaReturn('fresh'),
      )

      expect(next.todos).toEqual([{ text: 'fresh', done: false }])
      expect(base.todos[0].text).toBe('first')
    })

    it('finalizes nested drafts referenced from a returned object', () => {
      const slice = makeSlice()
      const base = slice.getInitialState()
      const next = slice.reducer(base, slice.actions.clearedKeepingMeta())

      expect(next.todos).toEqual([])
      expect(next.meta).toEqual({ count: 1 })
      // must not be a revoked proxy
      expect(() => JSON.stringify(next)).not.toThrow()
    })

    it('freezes results and the initial state', () => {
      const slice = makeSlice()
      expect(Object.isFrozen(slice.getInitialState())).toBe(true)
      expect(Object.isFrozen(slice.getInitialState().meta)).toBe(true)

      const next = slice.reducer(
        undefined,
        slice.actions.addedViaMutation('second'),
      )
      expect(Object.isFrozen(next)).toBe(true)
      expect(Object.isFrozen(next.todos)).toBe(true)
      expect(Object.isFrozen(next.todos[1])).toBe(true)
    })

    it('handles primitive (non-draftable) state', () => {
      const counterSlice = createSlice({
        name: 'counter',
        initialState: 0,
        immutability: adapter,
        reducers: {
          incremented(state) {
            return state + 1
          },
        },
      })

      expect(
        counterSlice.reducer(undefined, counterSlice.actions.incremented()),
      ).toBe(1)
      expect(counterSlice.reducer(5, counterSlice.actions.incremented())).toBe(
        6,
      )
    })

    it('works end to end in a store', () => {
      const slice = makeSlice()
      const store = configureStore({ reducer: { todos: slice.reducer } })
      store.dispatch(slice.actions.addedViaMutation('from store'))
      expect(store.getState().todos.todos).toHaveLength(2)
    })
  },
)

describe('noopAdapter', () => {
  const makeSlice = () =>
    createSlice({
      name: 'todos',
      initialState: getInitialState(),
      immutability: noopAdapter,
      reducers: {
        replacedViaReturn(state, action: PayloadAction<string>) {
          return {
            ...state,
            todos: [...state.todos, { text: action.payload, done: false }],
          }
        },
        mutatedWithoutReturn(state) {
          state.meta.count++
        },
      },
    })

  it('supports return-style (hand-written spread) reducers', () => {
    const slice = makeSlice()
    const base = slice.getInitialState()
    const next = slice.reducer(base, slice.actions.replacedViaReturn('second'))

    expect(next).not.toBe(base)
    expect(next.todos).toHaveLength(2)
    expect(base.todos).toHaveLength(1)
  })

  it('does not freeze state', () => {
    const slice = makeSlice()
    expect(Object.isFrozen(slice.getInitialState())).toBe(false)

    const next = slice.reducer(
      undefined,
      slice.actions.replacedViaReturn('second'),
    )
    expect(Object.isFrozen(next)).toBe(false)
  })

  it('throws if a case reducer mutates without returning the next state', () => {
    const slice = makeSlice()
    expect(() =>
      slice.reducer(undefined, slice.actions.mutatedWithoutReturn()),
    ).toThrowError(
      /case reducer on a non-draftable value must not return undefined/,
    )
  })

  it('handles primitive state', () => {
    const counterSlice = createSlice({
      name: 'counter',
      initialState: 0,
      immutability: noopAdapter,
      reducers: {
        incremented(state) {
          return state + 1
        },
      },
    })

    expect(counterSlice.reducer(4, counterSlice.actions.incremented())).toBe(5)
  })
})

describe('buildCreateSlice provisioning', () => {
  it('binds a default adapter at the builder level', () => {
    const createNoopSlice = buildCreateSlice({ immutability: noopAdapter })
    const slice = createNoopSlice({
      name: 'todos',
      initialState: getInitialState(),
      reducers: {
        replaced(state, action: PayloadAction<string>) {
          return { ...state, todos: [{ text: action.payload, done: false }] }
        },
      },
    })

    expect(Object.isFrozen(slice.getInitialState())).toBe(false)
    const next = slice.reducer(undefined, slice.actions.replaced('new'))
    expect(next.todos[0].text).toBe('new')
    expect(Object.isFrozen(next)).toBe(false)
  })

  it('per-slice immutability option overrides the builder default', () => {
    const createNoopSlice = buildCreateSlice({ immutability: noopAdapter })
    const slice = createNoopSlice({
      name: 'todos',
      initialState: getInitialState(),
      immutability: immerAdapter,
      reducers: {
        added(state, action: PayloadAction<string>) {
          state.todos.push({ text: action.payload, done: false })
        },
      },
    })

    const next = slice.reducer(undefined, slice.actions.added('second'))
    expect(next.todos).toHaveLength(2)
    expect(Object.isFrozen(next)).toBe(true)
  })

  it('throws if no adapter is provided', () => {
    expect(() => buildCreateSlice({} as any)).toThrowError(
      /`immutability` adapter/,
    )
  })

  it('the default createSlice export uses the Immer adapter', () => {
    const slice = createSlice({
      name: 'todos',
      initialState: getInitialState(),
      reducers: {
        added(state, action: PayloadAction<string>) {
          state.todos.push({ text: action.payload, done: false })
        },
      },
    })

    const next = slice.reducer(undefined, slice.actions.added('second'))
    expect(next.todos).toHaveLength(2)
    expect(Object.isFrozen(next)).toBe(true)
  })
})

describe('buildCreateReducer provisioning', () => {
  it('the default createReducer export uses the Immer adapter', () => {
    const reducer = createReducer(getInitialState(), (builder) => {
      builder.addCase(
        'added',
        (state, action: PayloadAction<string, 'added'>) => {
          state.todos.push({ text: action.payload, done: false })
        },
      )
    })

    const next = reducer(undefined, { type: 'added', payload: 'second' })
    expect(next.todos).toHaveLength(2)
    expect(Object.isFrozen(next)).toBe(true)
  })

  it('binds a default adapter at the builder level', () => {
    const createNoopReducer = buildCreateReducer({ immutability: noopAdapter })
    const reducer = createNoopReducer(getInitialState(), (builder) => {
      builder.addCase(
        'replaced',
        (state, action: PayloadAction<string, 'replaced'>) => {
          return { ...state, todos: [{ text: action.payload, done: false }] }
        },
      )
    })

    expect(Object.isFrozen(reducer.getInitialState())).toBe(false)
    const next = reducer(undefined, { type: 'replaced', payload: 'new' })
    expect(next.todos[0].text).toBe('new')
    expect(Object.isFrozen(next)).toBe(false)
  })

  it('per-call adapter argument overrides the builder default', () => {
    const createNoopReducer = buildCreateReducer({ immutability: noopAdapter })
    const reducer = createNoopReducer(
      getInitialState(),
      (builder) => {
        builder.addCase(
          'added',
          (state, action: PayloadAction<string, 'added'>) => {
            state.todos.push({ text: action.payload, done: false })
          },
        )
      },
      immerAdapter,
    )

    const next = reducer(undefined, { type: 'added', payload: 'second' })
    expect(next.todos).toHaveLength(2)
    expect(Object.isFrozen(next)).toBe(true)
  })

  it('throws if no adapter is provided', () => {
    expect(() => buildCreateReducer({} as any)).toThrowError(
      /`immutability` adapter/,
    )
  })
})
