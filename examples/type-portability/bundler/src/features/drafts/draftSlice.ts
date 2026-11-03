import type { Draft, PayloadAction, WritableDraft } from '@reduxjs/toolkit'
import { createAction, createReducer, createSlice } from '@reduxjs/toolkit'

export interface TodoState {
  readonly todos: readonly { readonly id: string; readonly done: boolean }[]
}

const initialState: TodoState = { todos: [] }

const toggle = (state: Draft<TodoState>, id: string) => {
  const todo = state.todos.find((todo) => todo.id === id)
  if (todo) {
    todo.done = !todo.done
  }
}

export const toggleTodo = createAction<string>('drafts/toggleTodo')

export const draftReducer = createReducer(initialState, (builder) => {
  builder.addCase(toggleTodo, (state, action) => {
    toggle(state, action.payload)
  })
})

export const draftSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    added(state, action: PayloadAction<string>) {
      state.todos.push({ id: action.payload, done: false })
    },
    toggled: (state, action: PayloadAction<string>) => {
      toggle(state, action.payload)
    },
  },
})

export const { added, toggled } = draftSlice.caseReducers

export const createTodoRecipe =
  (id: string) => (draft: WritableDraft<TodoState>) => {
    draft.todos.push({ id, done: false })
  }
