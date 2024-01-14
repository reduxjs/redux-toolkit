import { nanoid } from "@reduxjs/toolkit"
import type { Comment } from "./commentSlice"
import {
  commentSlice,
  addComment,
  deleteComment,
  selectAllComments,
  selectCommentById,
  selectCommentTotal,
  selectCommentsByTodoId,
  commentAdapter,
} from "./commentSlice"
import type { AppStore } from "../../app/store"
import { makeStore } from "../../app/store"
import { todoAdapter, type Todo, deleteTodo } from "./todoSlice"

interface LocalTestContext {
  store: AppStore
}

const initialTodo: Todo = { id: nanoid(), title: "Initial todo" }
const initialComment: Comment = {
  id: nanoid(),
  todoId: initialTodo.id,
  message: "Initial comment",
}

describe<LocalTestContext>("comment slice", it => {
  beforeEach<LocalTestContext>(context => {
    const store = makeStore({
      todo: todoAdapter.setOne(todoAdapter.getInitialState(), initialTodo),
      comments: commentAdapter.setOne(
        commentAdapter.getInitialState(),
        initialComment,
      ),
    })

    context.store = store
  })

  it("should handle initial state", () => {
    expect(commentSlice.reducer(undefined, { type: "unknown" })).toStrictEqual(
      commentSlice.getInitialState(),
    )
  })

  it("should add a comment", ({ store }) => {
    expect(selectCommentTotal(store.getState())).toBe(1)
    expect(
      selectCommentById(store.getState(), initialComment.id),
    ).toStrictEqual(initialComment)
    const comment = {
      todoId: initialTodo.id,
      message: "This is a comment",
    }

    store.dispatch(addComment(comment))

    const comments = selectAllComments(store.getState())
    expect(comments).toEqual([
      initialComment,
      { id: expect.any(String), ...comment },
    ])
  })

  it("should delete a comment", ({ store }) => {
    expect(selectCommentTotal(store.getState())).toBe(1)
    store.dispatch(deleteComment(initialComment.id))

    const comments = selectAllComments(store.getState())
    expect(comments.length).toBe(0)
  })

  it("should delete a comment when its todo is deleted", ({ store }) => {
    expect(selectCommentTotal(store.getState())).toBe(1)
    expect(selectCommentsByTodoId(store.getState(), initialTodo.id)).toEqual([
      initialComment,
    ])
    store.dispatch(deleteTodo(initialTodo.id))
    expect(selectCommentsByTodoId(store.getState(), initialTodo.id)).toEqual([])
  })
})
