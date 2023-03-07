import type { Action, AnyAction, Middleware, StoreEnhancer } from 'redux'
import type { Context } from 'react'
import { useEffect } from 'react'
import React from 'react'
import type { ReactReduxContextValue } from 'react-redux'
import { Provider } from 'react-redux'
import { setupListeners } from '@reduxjs/toolkit/query'
import type { Api } from '@reduxjs/toolkit/dist/query/apiTypes'
import type { ConfigureStoreOptions } from '../../configureStore';
import { configureStore } from '../../configureStore'
import type { CurriedGetDefaultMiddleware, ThunkMiddlewareFor } from '../../getDefaultMiddleware'

// copied from configureStore
type Middlewares<S> = ReadonlyArray<Middleware<{}, S>>
type Enhancers = ReadonlyArray<StoreEnhancer>

/**
 * Low-level way to create a custom ApiProvider with configureStore options
 * `options` is the same as for `configureStore` minus the `reducer` property
 * Useful for if you need to set devtool or additional middlewares to the store
 */
export function createApiProvider<
  A extends Action = AnyAction,
  M extends Middlewares<any> = [ThunkMiddlewareFor<any>],
  E extends Enhancers = [StoreEnhancer]
>(options: Omit<ConfigureStoreOptions<any, A, M, E>, 'reducer'>) {
  const { middleware, ...remaining } = options;

  const processMiddleware = (apiMiddleware: Middleware) => (gDM: CurriedGetDefaultMiddleware<any>) =>
    Array.isArray(middleware) ? middleware.concat([apiMiddleware]) : gDM().concat(apiMiddleware);

  return function <A extends Api<any, {}, any, any>>(props: {
    children: any
    api: A
    setupListeners?: Parameters<typeof setupListeners>[1] | false
    context?: Context<ReactReduxContextValue>
  }) {
    const [store] = React.useState(() =>
      configureStore({
        reducer: {
          [props.api.reducerPath]: props.api.reducer,
        },
        middleware: processMiddleware(props.api.middleware),
        ...remaining
      })
    )
    // Adds the event listeners for online/offline/focus/etc
    useEffect(
      (): undefined | (() => void) =>
        props.setupListeners === false
          ? undefined
          : setupListeners(store.dispatch, props.setupListeners),
      [props.setupListeners, store.dispatch]
    )

    return (
      <Provider store={store} context={props.context}>
        {props.children}
      </Provider>
    )
  }
}

/**
 * Can be used as a `Provider` if you **do not already have a Redux store**.
 *
 * @example
 * ```tsx
 * // codeblock-meta title="Basic usage - wrap your App with ApiProvider"
 * import * as React from 'react';
 * import { ApiProvider } from '@reduxjs/toolkit/query/react';
 * import { Pokemon } from './features/Pokemon';
 *
 * function App() {
 *   return (
 *     <ApiProvider api={api}>
 *       <Pokemon />
 *     </ApiProvider>
 *   );
 * }
 * ```
 *
 * @remarks
 * Using this together with an existing redux store, both will
 * conflict with each other - please use the traditional redux setup
 * in that case.
 */
export const ApiProvider = createApiProvider({});

