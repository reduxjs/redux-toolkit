export { combineReducers, compose } from 'redux'
export { default as createNextState } from 'immer'
export { default as createSelector } from 'selectorator'

export { configureStore, getDefaultMiddleware } from './configureStore'
export { createAction, getType } from './createAction'
export { createReducer } from './createReducer'
export { createSlice } from './createSlice'
export {
  default as createSerializableStateInvariantMiddleware,
  isPlain
} from './serializableStateInvariantMiddleware'

// Unfortunately, Babel's TypeScript plugin doesn't let us re-export
// types using the `export { ... } from` syntax. Because it compiles
// modules, independently, it has no way of knowing whether an identifier
// refers to a type or value, and thus cannot strip the type re-exports
// out of the generated JS.
//
// https://github.com/babel/babel/issues/8361
//
// As a workaround, the root of this repository contains an `index.d.ts`
// that contains all type re-exports. Whenever adding a new public function
// or type, remember to export it in `index.d.ts` as well.
