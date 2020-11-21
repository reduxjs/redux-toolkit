import { Store } from '@reduxjs/toolkit';
import React from 'react';
import { Provider } from 'react-redux';

export function expectType<T>(t: T) {
  return t;
}
export const ANY = 0 as any;

export async function waitMs(time = 150) {
  const now = Date.now();
  while (Date.now() < now + time) {
    await new Promise((res) => process.nextTick(res));
  }
}

export function withProvider(store: Store<any>) {
  return function Wrapper({ children }: any) {
    return <Provider store={store}>{children}</Provider>;
  };
}
