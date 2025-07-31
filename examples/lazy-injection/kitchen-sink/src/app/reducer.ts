import { combineSlices } from "@reduxjs/toolkit"
import { todoSlice } from "../features/todos/todoSlice"

export interface LazyLoadedSlices {}

// `combineSlices` automatically combines the reducers using
// their `reducerPath`s, therefore we no longer need to call `combineReducers`.
export const rootReducer =
  combineSlices(todoSlice).withLazyLoadedSlices<LazyLoadedSlices>()
