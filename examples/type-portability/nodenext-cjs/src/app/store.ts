import ReduxToolkit = require('@reduxjs/toolkit')
import RTKQuery = require('@reduxjs/toolkit/query')
import authSliceModule = require('../features/auth/authSlice.js')
import pollingSliceModule = require('../features/polling/pollingSlice.js')
import dynamicMiddlewareModule = require('./dynamicMiddleware.js')
import dynamicReactMiddlewareModule = require('./dynamicReactMiddleware.js')
import listenerMiddlewareModule = require('./listenerMiddleware.js')
import apiModule = require('./services/api.js')

namespace storeModule {
  import combineSlices = ReduxToolkit.combineSlices
  import configureStore = ReduxToolkit.configureStore
  import setupListeners = RTKQuery.setupListeners
  import authSlice = authSliceModule.authSlice
  import pollingSlice = pollingSliceModule.pollingSlice
  import dynamicMiddleware = dynamicMiddlewareModule.dynamicMiddleware
  import dynamicReactMiddleware = dynamicReactMiddlewareModule.dynamicReactMiddleware
  import listenerMiddleware = listenerMiddlewareModule.listenerMiddleware
  import apiSlice = apiModule.apiSlice

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
}

export = storeModule
