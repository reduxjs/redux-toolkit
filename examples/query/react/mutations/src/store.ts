import { configureStore } from '@reduxjs/toolkit'
import { api } from './app/services/posts'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  // adding the api middleware enables caching, invalidation, polling and other features of `rtk-query`
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})
