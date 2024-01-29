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
  reducers: {
    property: () => {},
    method(state, action: PayloadAction<Todo>) {
      todoAdapter.addOne(state, action)
    },
    identifier: todoAdapter.removeOne,
    preparedProperty: {
      prepare: (todo: Omit<Todo, 'id'>) => ({
        payload: { id: nanoid(), ...todo }
      }),
      reducer: () => {}
    },
    preparedMethod: {
      prepare(todo: Omit<Todo, 'id'>) {
        return { payload: { id: nanoid(), ...todo } }
      },
      reducer(state, action: PayloadAction<Todo>) {
        todoAdapter.addOne(state, action)
      }
    },
    preparedIdentifier: {
      prepare: withPayload(),
      reducer: todoAdapter.setMany
    }
  }
})