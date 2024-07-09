import ReduxToolkit = require('@reduxjs/toolkit')
import authSliceModule = require('../features/auth/authSlice.js')
import pollingSliceModule = require('../features/polling/pollingSlice.js')
import apiModule = require('./services/api.js')

namespace storeModule {
  import combineSlices = ReduxToolkit.combineSlices
  import configureStore = ReduxToolkit.configureStore
  import authSlice = authSliceModule.authSlice
  import pollingSlice = pollingSliceModule.pollingSlice
  import apiSlice = apiModule.apiSlice

  export const rootReducer = combineSlices(pollingSlice, authSlice, apiSlice)

  export const { inject, selector, withLazyLoadedSlices } = rootReducer

  export const { original } = selector

  export type RootState = ReturnType<typeof rootReducer>

  export const setupStore = (preloadedState?: Partial<RootState>) =>
    configureStore({
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
      preloadedState,
      enhancers: (getDefaultEnhancers) => getDefaultEnhancers(),
    })

  export const store = setupStore()

  export const { dispatch, getState, replaceReducer, subscribe } = store

  export type AppStore = typeof store
  export type AppDispatch = typeof store.dispatch
}

export = storeModule
