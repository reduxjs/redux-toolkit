import { nanoid } from "@reduxjs/toolkit"
import type { AppStore } from "../../app/store"
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

interface LocalTestContext {
  store: AppStore
}

const initialTodo: Todo = { id: nanoid(), title: "Initial todo" }

describe<LocalTestContext>("counter reducer", it => {
  beforeEach<LocalTestContext>(context => {
    const store = makeStore({
      todo: todoAdapter.setOne(todoAdapter.getInitialState(), initialTodo),
    })

    context.store = store
  })

  it("should handle initial state", () => {
    expect(todoSlice.reducer(undefined, { type: "unknown" })).toStrictEqual(
      todoAdapter.getInitialState(),
    )
  })

  it("should handle addTodo", ({ store }) => {
    expect(selectTodoIds(store.getState())).toStrictEqual([initialTodo.id])

    store.dispatch(addTodo({ title: "Second todo!" }))

    const ids = selectTodoIds(store.getState())
    expect(ids).toStrictEqual([initialTodo.id, expect.any(String)])
    expect(selectTodoById(store.getState(), ids[1])).toStrictEqual({
      id: ids[1],
      title: "Second todo!",
    })
  })

  it("should handle deleteTodo", ({ store }) => {
    expect(selectAllTodos(store.getState())).toStrictEqual([initialTodo])

    store.dispatch(deleteTodo(initialTodo.id))

    expect(selectTodoTotal(store.getState())).toBe(0)
    expect(selectTodoEntities(store.getState())).toStrictEqual({})
  })
})
