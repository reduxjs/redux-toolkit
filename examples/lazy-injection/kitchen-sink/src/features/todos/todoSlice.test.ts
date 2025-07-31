import { nanoid } from "@reduxjs/toolkit"
import { makeStore } from "../../app/store"
import type { Todo } from "./todoSlice"
import {
  addTodo,
  deleteTodo,
  selectAllTodos,
  selectTodoById,
  selectTodoEntities,
  selectTodoIds,
  selectTodoTotal,
  todoAdapter,
  todoSlice,
} from "./todoSlice"

const initialTodo: Todo = { id: nanoid(), title: "Initial todo" }

describe("counter reducer", () => {
  let store = makeStore()
  beforeEach(() => {
    store = makeStore({
      todo: todoAdapter.setOne(todoAdapter.getInitialState(), initialTodo),
    })
  })

  it("should handle initial state", () => {
    expect(todoSlice.reducer(undefined, { type: "unknown" })).toStrictEqual(
      todoAdapter.getInitialState(),
    )
  })

  it("should handle addTodo", () => {
    expect(selectTodoIds(store.getState())).toStrictEqual([initialTodo.id])

    store.dispatch(addTodo({ title: "Second todo!" }))

    const ids = selectTodoIds(store.getState())
    expect(ids).toStrictEqual([initialTodo.id, expect.any(String)])
    expect(selectTodoById(store.getState(), ids[1])).toStrictEqual({
      id: ids[1],
      title: "Second todo!",
    })
  })

  it("should handle deleteTodo", () => {
    expect(selectAllTodos(store.getState())).toStrictEqual([initialTodo])

    store.dispatch(deleteTodo(initialTodo.id))

    expect(selectTodoTotal(store.getState())).toBe(0)
    expect(selectTodoEntities(store.getState())).toStrictEqual({})
  })
})
