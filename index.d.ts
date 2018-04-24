import { Action, Middleware, Reducer, StoreCreator, StoreEnhancer } from 'redux'

export function configureStore<S>(options: {
  reducer: Reducer<S>
  middleware: Middleware[]
  devTools: boolean
  preloadedState: S
  enhancers: StoreEnhancer<S>
}): StoreCreator
export function getDefaultMiddleware(): Middleware[]
export function createReducer<S>(
  initialState: S,
  actionsMap: { [string: string]: Action }
): Reducer<S>

export { default as createNextState } from 'immer'
export { combineReducers, compose } from 'redux'
export { default as createSelector } from 'selectorator'
