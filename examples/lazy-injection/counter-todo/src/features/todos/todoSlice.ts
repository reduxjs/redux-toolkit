import { createEntityAdapter, createSelector, nanoid } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"
import type { RootState } from "../../app/store"

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
})

export const { addTodo, deleteTodo } = todoSlice.actions

export const {
  selectAll: selectAllTodos,
  selectById: selectTodoById,
  selectEntities: selectTodoEntities,
  selectIds: selectTodoIds,
  selectTotal: selectTodoTotal,
} = todoAdapter.getSelectors((state: RootState) => todoSlice.selectSlice(state))
