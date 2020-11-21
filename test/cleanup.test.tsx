// tests for "cleanup-after-unsubscribe" behaviour

import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { createApi, QueryStatus } from '@rtk-incubator/rtk-query';
import { render, waitFor } from '@testing-library/react';
import { withProvider } from './helpers';

const api = createApi({
  baseQuery: () => {},
  endpoints: (build) => ({
    a: build.query<unknown, void>({ query: () => '' }),
    b: build.query<unknown, void>({ query: () => '' }),
  }),
});
const getStore = () =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  });
let store = getStore();

beforeEach(() => {
  store = getStore();
});

let getSubStateA = () => store.getState().api.queries['a/""'];
let getSubStateB = () => store.getState().api.queries['b/""'];

function UsingA() {
  api.hooks.useAQuery();
  return <></>;
}

function UsingB() {
  api.hooks.useBQuery();
  return <></>;
}

function UsingAB() {
  api.hooks.useAQuery();
  api.hooks.useBQuery();
  return <></>;
}

test('data stays in store when component stays rendered', async () => {
  expect(getSubStateA()).toBeUndefined();

  render(<UsingA />, { wrapper: withProvider(store) });
  await waitFor(() => expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled));

  jest.advanceTimersByTime(120000);

  await waitFor(() => expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled));
});

test('data is removed from store after 60 seconds', async () => {
  expect(getSubStateA()).toBeUndefined();

  const { unmount } = render(<UsingA />, { wrapper: withProvider(store) });
  await waitFor(() => expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled));

  unmount();

  jest.advanceTimersByTime(59000);

  expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled);

  jest.advanceTimersByTime(2000);

  expect(getSubStateA()).toBeUndefined();
});

test('data stays in store when component stays rendered while data for another component is removed after it unmounted', async () => {
  expect(getSubStateA()).toBeUndefined();
  expect(getSubStateB()).toBeUndefined();

  const { rerender } = render(
    <>
      <UsingA />
      <UsingB />
    </>,
    { wrapper: withProvider(store) }
  );
  await waitFor(() => {
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled);
    expect(getSubStateB()?.status).toBe(QueryStatus.fulfilled);
  });

  const statusA = getSubStateA();

  rerender(
    <>
      <UsingA />
    </>
  );

  jest.advanceTimersByTime(120000);

  expect(getSubStateA()).toEqual(statusA);
  expect(getSubStateB()).toBeUndefined();
});

test('data stays in store when one component requiring the data stays in the store', async () => {
  expect(getSubStateA()).toBeUndefined();
  expect(getSubStateB()).toBeUndefined();

  const { rerender } = render(
    <>
      <UsingA />
      <UsingAB />
    </>,
    { wrapper: withProvider(store) }
  );
  await waitFor(() => {
    expect(getSubStateA()?.status).toBe(QueryStatus.fulfilled);
    expect(getSubStateB()?.status).toBe(QueryStatus.fulfilled);
  });

  const statusA = getSubStateA();
  const statusB = getSubStateB();

  rerender(
    <>
      <UsingAB />
    </>
  );

  jest.advanceTimersByTime(120000);

  expect(getSubStateA()).toEqual(statusA);
  expect(getSubStateB()).toEqual(statusB);
});
