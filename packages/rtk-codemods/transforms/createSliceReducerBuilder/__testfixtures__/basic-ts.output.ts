import type { PayloadAction } from '@reduxjs/toolkit'
import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload(): any {
  throw new Error('Function not implemented.')
}

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

const todoSlice = createSlice({
  name: 'todo',
  initialState: todoAdapter.getInitialState(),

  reducers: (create) => ({
    property: create.reducer(() => {}),

    method: create.reducer((state, action: PayloadAction<Todo>) => {
      todoAdapter.addOne(state, action)
    }),

    identifier: create.reducer(todoAdapter.removeOne),

    preparedProperty: create.preparedReducer((todo: Omit<Todo, 'id'>) => ({
      payload: { id: nanoid(), ...todo }
    }), () => {}),

    preparedMethod: create.preparedReducer((todo: Omit<Todo, 'id'>) => {
      return { payload: { id: nanoid(), ...todo } }
    }, (state, action: PayloadAction<Todo>) => {
      todoAdapter.addOne(state, action)
    }),

    preparedIdentifier: create.preparedReducer(withPayload(), todoAdapter.setMany)
  })
})