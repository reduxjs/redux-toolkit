import { Store } from '@reduxjs/toolkit';
import React from 'react';
import { Provider } from 'react-redux';

export function expectType<T>(t: T) {
  return t;
}
export const ANY = 0 as any;

export function waitMs(time = 150) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function withProvider(store: Store<any>) {
  return function Wrapper({ children }: any) {
    return <Provider store={store}>{children}</Provider>;
  };
}
