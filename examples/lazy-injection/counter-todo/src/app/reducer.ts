import { combineSlices } from "@reduxjs/toolkit"

export interface LazyLoadedSlices {}

// `combineSlices` automatically combines the reducers using
// their `reducerPath`s, therefore we no longer need to call `combineReducers`.
export const rootReducer = combineSlices({
  static: () => 0,
}).withLazyLoadedSlices<LazyLoadedSlices>()
