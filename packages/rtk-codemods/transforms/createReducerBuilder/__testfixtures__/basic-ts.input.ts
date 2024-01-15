import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

createReducer(todoInitialState, {
  [todoAdded1a]: (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  },
  [todoRemoved]: todoAdapter.removeOne,
  todoAdded: todoAdapter.addOne
})

createReducer(todoInitialState, {
  [todoAdded](state: TodoSliceState, action: PayloadAction<string>) {
    // stuff
  }
})
