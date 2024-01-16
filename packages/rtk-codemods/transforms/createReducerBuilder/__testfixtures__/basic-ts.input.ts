import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createReducer } from '@reduxjs/toolkit'

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoInitialState = todoAdapter.getInitialState()

export type TodoSliceState = typeof todoInitialState

const { addOne } = todoAdapter

createReducer(todoInitialState, {
  [todoAdded1a]: (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  },
  [todoAdded1b]: (state: TodoSliceState, action: PayloadAction<string>) => action.payload,
  [todoAdded1c + 'test']: (state:TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  },
  [todoAdded1d](state: TodoSliceState, action: PayloadAction<string>) {
    // stuff
  },
  [todoAdded1e]: function(state: TodoSliceState, action: PayloadAction<string>) {
    // stuff
  },
  todoAdded1f: (state: TodoSliceState, action: PayloadAction<string>) => {
    //stuff
  },
  [todoAdded1g]: addOne,
  todoAdded1h: todoAdapter.addOne,
})

createReducer(todoInitialState, {
  [todoAdded2a]: (state: TodoSliceState, action: PayloadAction<string>) => {
    // stuff
  },
  [todoAdded2b](state: TodoSliceState, action: PayloadAction<string>) {
    // stuff
  },
  [todoAdded2c]: function(state: TodoSliceState, action: PayloadAction<string>) {
    // stuff
  }
})
