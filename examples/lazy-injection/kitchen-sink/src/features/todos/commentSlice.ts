import { createEntityAdapter, createSelector, nanoid } from "@reduxjs/toolkit"
import { createAppSlice } from "../../app/createAppSlice"
import { deleteTodo } from "./todoSlice"

export interface Comment {
  id: string
  todoId: string
  message: string
}

export const commentAdapter = createEntityAdapter<Comment>()

const localisedSelectors = commentAdapter.getSelectors()

const initialState = commentAdapter.getInitialState()

const createCommentSliceSelector =
  createSelector.withTypes<typeof initialState>()

export const commentSlice = createAppSlice({
  name: "comments",
  initialState,
  reducers: {
    addComment: {
      reducer: commentAdapter.setOne,
      prepare: (comment: Omit<Comment, "id">) => ({
        payload: { id: nanoid(), ...comment },
      }),
    },
    deleteComment: commentAdapter.removeOne,
  },
  extraReducers: builder => {
    builder.addCase(deleteTodo, (state, action) => {
      commentAdapter.removeMany(
        state,
        state.ids.filter(id => state.entities[id]?.todoId === action.payload)
      )
    })
  },
  selectors: {
    selectAllComments: localisedSelectors.selectAll,
    selectCommentById: localisedSelectors.selectById,
    selectCommentEntities: localisedSelectors.selectEntities,
    selectCommentIds: localisedSelectors.selectIds,
    selectCommentTotal: localisedSelectors.selectTotal,
    selectCommentsByTodoId: createCommentSliceSelector(
      [localisedSelectors.selectAll, (_state, todoId: string) => todoId],
      (comments, todoId) =>
        comments.filter(comment => comment.todoId === todoId)
    ),
  },
})

export const { addComment, deleteComment } = commentSlice.actions

export const {
  selectAllComments,
  selectCommentById,
  selectCommentEntities,
  selectCommentIds,
  selectCommentTotal,
  selectCommentsByTodoId,
} = commentSlice.selectors
