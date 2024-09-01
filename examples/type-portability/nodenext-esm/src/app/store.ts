import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authSlice } from '../features/auth/authSlice.js'
import { pollingSlice } from '../features/polling/pollingSlice.js'
import { dynamicMiddleware } from './dynamicMiddleware.js'
import { dynamicReactMiddleware } from './dynamicReactMiddleware.js'
import { listenerMiddleware } from './listenerMiddleware.js'
import { apiSlice } from './services/api.js'

export const rootReducer = combineSlices(pollingSlice, authSlice, apiSlice)

export const { inject, selector, withLazyLoadedSlices } = rootReducer

export const { original } = selector

export type RootState = ReturnType<typeof rootReducer>

export const setupStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(listenerMiddleware.middleware)
        .prepend(dynamicMiddleware.middleware)
        .prepend(dynamicReactMiddleware.middleware)
        .concat(apiSlice.middleware),
    preloadedState,
    enhancers: (getDefaultEnhancers) => getDefaultEnhancers(),
  })

export const store = setupStore()

setupListeners(store.dispatch)

export const { dispatch, getState, replaceReducer, subscribe } = store

export type AppStore = typeof store
export type AppDispatch = typeof store.dispatch
