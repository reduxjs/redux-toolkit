import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

createReducer(todoInitialState, (builder) => {
  builder.addCase(todoAdded1a, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });

  builder.addCase(todoRemoved, todoAdapter.removeOne);
  builder.addCase(todoAdded, todoAdapter.addOne);
})

createReducer(todoInitialState, (builder) => {
  builder.addCase(todoAdded, (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  });
})
