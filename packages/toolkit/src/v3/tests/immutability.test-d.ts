import type { Draft as ImmerDraft } from 'immer'
import type { PayloadAction } from '../../createAction'
import type { ActionCreatorWithPayload } from '../../createAction'
import { buildCreateSlice, createSlice } from '../index'
import { noopAdapter } from '../immutability'
import type { Draft } from '../immutability'

describe('vendored Draft type matches Immer Draft', () => {
  it('agrees for primitives and atomic objects', () => {
    expectTypeOf<Draft<number>>().toEqualTypeOf<ImmerDraft<number>>()
    expectTypeOf<Draft<string | null>>().toEqualTypeOf<
      ImmerDraft<string | null>
    >()
    expectTypeOf<Draft<Date>>().toEqualTypeOf<ImmerDraft<Date>>()
    expectTypeOf<Draft<RegExp>>().toEqualTypeOf<ImmerDraft<RegExp>>()
    expectTypeOf<Draft<() => void>>().toEqualTypeOf<ImmerDraft<() => void>>()
    expectTypeOf<Draft<Promise<number>>>().toEqualTypeOf<
      ImmerDraft<Promise<number>>
    >()
  })

  it('agrees for objects, arrays, and tuples', () => {
    interface Nested {
      readonly a: number
      readonly b: { readonly c: string[] }
    }
    expectTypeOf<Draft<Nested>>().toEqualTypeOf<ImmerDraft<Nested>>()
    expectTypeOf<Draft<readonly number[]>>().toEqualTypeOf<
      ImmerDraft<readonly number[]>
    >()
    expectTypeOf<Draft<readonly [string, number]>>().toEqualTypeOf<
      ImmerDraft<readonly [string, number]>
    >()
  })

  it('agrees for collections and weak references', () => {
    expectTypeOf<Draft<ReadonlyMap<string, { readonly x: number }>>>()
      .toEqualTypeOf<ImmerDraft<ReadonlyMap<string, { readonly x: number }>>>()
    expectTypeOf<Draft<ReadonlySet<readonly number[]>>>().toEqualTypeOf<
      ImmerDraft<ReadonlySet<readonly number[]>>
    >()
    expectTypeOf<Draft<WeakMap<object, string>>>().toEqualTypeOf<
      ImmerDraft<WeakMap<object, string>>
    >()
    expectTypeOf<Draft<WeakSet<object>>>().toEqualTypeOf<
      ImmerDraft<WeakSet<object>>
    >()
  })

  it('agrees for unions and optional properties', () => {
    interface WithOptional {
      readonly a?: number
      readonly b: string | undefined
    }
    expectTypeOf<Draft<WithOptional>>().toEqualTypeOf<
      ImmerDraft<WithOptional>
    >()
    expectTypeOf<
      Draft<{ readonly x: number } | readonly string[]>
    >().toEqualTypeOf<ImmerDraft<{ readonly x: number } | readonly string[]>>()
  })
})

describe('createSlice typing with immutability options', () => {
  it('per-slice immutability option does not disturb inference', () => {
    const slice = createSlice({
      name: 'todos',
      initialState: { todos: [] as string[] },
      immutability: noopAdapter,
      reducers: {
        added(state, action: PayloadAction<string>) {
          return { todos: [...state.todos, action.payload] }
        },
      },
    })

    expectTypeOf(slice.actions.added).toEqualTypeOf<
      ActionCreatorWithPayload<string, 'todos/added'>
    >()
    expectTypeOf(slice.getInitialState()).toEqualTypeOf<{ todos: string[] }>()
  })

  it('buildCreateSlice returns a createSlice supporting both forms', () => {
    const createNoopSlice = buildCreateSlice({ immutability: noopAdapter })

    const objectSlice = createNoopSlice({
      name: 'obj',
      initialState: 0,
      reducers: {
        incremented(state) {
          return state + 1
        },
      },
    })
    expectTypeOf(objectSlice.actions.incremented().type).toEqualTypeOf<
      'obj/incremented'
    >()

    const callbackSlice = createNoopSlice({
      name: 'cb',
      initialState: { value: 0 },
      reducers: (create) => ({
        set: create.reducer<number>((state, action) => {
          expectTypeOf(action.payload).toEqualTypeOf<number>()
          return { value: action.payload }
        }),
      }),
    })
    expectTypeOf(callbackSlice.actions.set).toEqualTypeOf<
      ActionCreatorWithPayload<number, 'cb/set'>
    >()
  })
})
