import type { Draft, PayloadAction, WritableDraft } from '@reduxjs/toolkit'
import { createNextState, createSlice } from '@reduxjs/toolkit'
import type {
  Draft as ImmerDraft,
  WritableDraft as ImmerWritableDraft,
} from 'immer'
import { castDraft, produce } from 'immer'

interface Todo {
  readonly id: string
  readonly tags: readonly string[]
  readonly meta: { readonly createdAt: Date }
  readonly lookup: ReadonlyMap<string, { readonly n: number }>
  readonly seen: ReadonlySet<string>
}

describe('type tests', () => {
  test('Draft removes readonly recursively', () => {
    expectTypeOf<Draft<Todo>>().toEqualTypeOf<{
      id: string
      tags: string[]
      meta: { createdAt: Date }
      lookup: Map<string, { n: number }>
      seen: Set<string>
    }>()

    expectTypeOf<WritableDraft<Todo>>().toEqualTypeOf<Draft<Todo>>()

    expectTypeOf<Draft<number>>().toEqualTypeOf<number>()

    expectTypeOf<Draft<Date>>().toEqualTypeOf<Date>()

    expectTypeOf<Draft<readonly Todo[]>>().toEqualTypeOf<Draft<Todo>[]>()
  })

  test('Draft matches Immer for concrete types', () => {
    expectTypeOf<Draft<Todo>>().toEqualTypeOf<ImmerDraft<Todo>>()

    expectTypeOf<WritableDraft<Todo>>().toEqualTypeOf<
      ImmerWritableDraft<Todo>
    >()
  })

  test('Draft and Immer Draft are interchangeable for generic types', () => {
    function fromImmer<T>(value: ImmerDraft<T>): Draft<T> {
      return value
    }

    function toImmer<T>(value: Draft<T>): ImmerDraft<T> {
      return value
    }

    expectTypeOf(fromImmer<Todo>).returns.toEqualTypeOf<Draft<Todo>>()

    expectTypeOf(toImmer<Todo>).returns.toEqualTypeOf<ImmerDraft<Todo>>()
  })

  test('Immer helpers accept and produce RTK drafts', () => {
    const recipe = (draft: Draft<Todo>) => {
      draft.tags.push('a')
    }

    const todo = {} as Todo

    expectTypeOf(produce(todo, recipe)).toEqualTypeOf<Todo>()

    expectTypeOf(createNextState(todo, recipe)).toEqualTypeOf<Todo>()

    const state = {} as Draft<{ data?: Todo }>
    state.data = castDraft(todo)

    expectTypeOf(state).toEqualTypeOf<{ data?: Draft<Todo> }>()
  })

  test('case reducers receive an RTK Draft', () => {
    createSlice({
      name: 'todo',
      initialState: {} as Todo,
      reducers: {
        addTag(state, action: PayloadAction<string>) {
          expectTypeOf(state).toEqualTypeOf<Draft<Todo>>()

          state.tags.push(action.payload)
        },
      },
    })
  })
})
