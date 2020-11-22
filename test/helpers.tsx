import { AnyAction, configureStore, EnhancedStore, Store } from '@reduxjs/toolkit';
import React, { Reducer } from 'react';
import { Provider } from 'react-redux';

export function expectType<T>(t: T) {
  return t;
}
export const ANY = 0 as any;

export const DEFAULT_DELAY_MS = 150;

export async function waitMs(time = DEFAULT_DELAY_MS) {
  const now = Date.now();
  while (Date.now() < now + time) {
    await new Promise((res) => process.nextTick(res));
  }
}

export function waitForFakeTimer(time = DEFAULT_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function withProvider(store: Store<any>) {
  return function Wrapper({ children }: any) {
    return <Provider store={store}>{children}</Provider>;
  };
}

export function setupApiStore<
  A extends { reducerPath: any; reducer: Reducer<any, any>; middleware: any },
  R extends Record<string, Reducer<any, any>>
>(api: A, extraReducers?: R) {
  const getStore = () =>
    configureStore({
      reducer: { [api.reducerPath]: api.reducer, ...extraReducers },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
  type StoreType = ReturnType<typeof getStore> extends EnhancedStore<{}, any, infer M>
    ? EnhancedStore<
        {
          [K in A['reducerPath']]: ReturnType<A['reducer']>;
        } &
          {
            [K in keyof R]: ReturnType<R[K]>;
          },
        AnyAction,
        M
      >
    : never;

  const initialStore = getStore() as StoreType;
  const refObj = {
    api,
    store: initialStore,
    wrapper: withProvider(initialStore),
  };

  beforeEach(() => {
    const store = getStore() as StoreType;
    refObj.store = store;
    refObj.wrapper = withProvider(store);
  });

  return refObj;
}
