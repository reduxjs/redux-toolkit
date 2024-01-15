import { createEntityAdapter, nanoid } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"

export interface Todo {
  id: string
  title: string
}

export const todoAdapter = createEntityAdapter<Todo>()

export const todoSlice = createAppSlice({
  name: "todo",
  initialState: todoAdapter.getInitialState(),
  reducers: {
    addTodo: {
      reducer: todoAdapter.setOne,
      prepare: (todo: Omit<Todo, "id">) => ({
        payload: { id: nanoid(), ...todo },
      }),
    },
    deleteTodo: todoAdapter.removeOne,
  },
  selectors: {
    ...todoAdapter.getSelectors(),
  },
})

export const { addTodo, deleteTodo } = todoSlice.actions

export const {
  selectAll: selectAllTodos,
  selectById: selectTodoById,
  selectEntities: selectTodoEntities,
  selectIds: selectTodoIds,
  selectTotal: selectTodoTotal,
} = todoSlice.selectors
