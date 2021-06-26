import { combineReducers, configureStore, Store } from '@reduxjs/toolkit'
import { pokemonApi } from './services/pokemon'

const reducer = combineReducers({
  [pokemonApi.reducerPath]: pokemonApi.reducer,
})

export const createStore = (): Store => {
  return configureStore({
    reducer: reducer,
    // adding the api middleware enables caching, invalidation, polling and other features of `rtk-query`
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(pokemonApi.middleware),
  })
}
