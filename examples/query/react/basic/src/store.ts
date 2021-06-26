import { configureStore, Store } from '@reduxjs/toolkit'
import { pokemonApi } from './services/pokemon'

export const createStore = (): Store => {
  return configureStore({
    reducer: {
      [pokemonApi.reducerPath]: pokemonApi.reducer,
    },
    // adding the api middleware enables caching, invalidation, polling and other features of `rtk-query`
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(pokemonApi.middleware),
  })
}
