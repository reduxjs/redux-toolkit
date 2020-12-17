import * as React from 'react';
import { createApi, setupListeners } from '@rtk-incubator/rtk-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { setupApiStore, waitMs } from './helpers';
import { AnyAction } from '@reduxjs/toolkit';

// Just setup a temporary in-memory counter for tests that `getIncrementedAmount`.
// This can be used to test how many renders happen due to data changes or
// the refetching behavior of components.
let amount = 0;

const defaultApi = createApi({
  baseQuery: async (arg: any) => {
    await waitMs();
    if ('amount' in arg?.body) {
      amount += 1;
    }
    return { data: arg?.body ? { ...arg.body, ...(amount ? { amount } : {}) } : undefined };
  },
  endpoints: (build) => ({
    getIncrementedAmount: build.query<any, void>({
      query: () => ({
        url: '',
        body: {
          amount,
        },
      }),
    }),
  }),
  refetchOnFocus: true,
  refetchOnReconnect: true,
});

const storeRef = setupApiStore(defaultApi);

afterEach(() => {
  amount = 0;
});

describe('refetchOnFocus tests', () => {
  test('useQuery hook respects refetchOnFocus: true when set in createApi options', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery());
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      fireEvent.focus(window);
    });

    await waitMs();

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });

  test('useQuery hook respects refetchOnFocus: false from a hook and overrides createApi defaults', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnFocus: false,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      fireEvent.focus(window);
    });

    await waitMs();

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));
  });

  test('useQuery hook prefers refetchOnFocus: true when multiple components have different configurations', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnFocus: false,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    function UserWithRefetchTrue() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnFocus: true,
      }));
      return <div />;
    }

    let { getByTestId } = render(
      <div>
        <User />
        <UserWithRefetchTrue />
      </div>,
      { wrapper: storeRef.wrapper }
    );

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      fireEvent.focus(window);
    });
    expect(getByTestId('isLoading').textContent).toBe('false');
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });
});

describe('refetchOnReconnect tests', () => {
  test('useQuery hook respects refetchOnReconnect: true when set in createApi options', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery());
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });

  test('useQuery hook should not refetch when refetchOnReconnect: false from a hook and overrides createApi defaults', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnReconnect: false,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });
    expect(getByTestId('isFetching').textContent).toBe('false');
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));
  });

  test('useQuery hook prefers refetchOnReconnect: true when multiple components have different configurations', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnReconnect: false,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    function UserWithRefetchTrue() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnReconnect: true,
      }));
      return <div />;
    }

    let { getByTestId } = render(
      <div>
        <User />
        <UserWithRefetchTrue />
      </div>,
      { wrapper: storeRef.wrapper }
    );

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });
});

describe('customListenersHandler', () => {
  const storeRef = setupApiStore(defaultApi, undefined, true);

  test('setupListeners accepts a custom callback and executes it', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const dispatchSpy = jest.spyOn(storeRef.store, 'dispatch');

    let unsubscribe = () => {};
    unsubscribe = setupListeners(storeRef.store.dispatch, (dispatch, actions) => {
      const handleOnline = () => dispatch(defaultApi.internalActions.onOnline());
      window.addEventListener('online', handleOnline, false);
      console.log('setup!');
      return () => {
        window.removeEventListener('online', handleOnline);
        console.log('cleanup!');
      };
    });

    await waitMs();

    let data, isLoading, isFetching;

    function User() {
      ({ data, isFetching, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnReconnect: true,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    expect(consoleSpy).toHaveBeenCalledWith('setup!');

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });
    expect(dispatchSpy).toHaveBeenCalled();
    expect(defaultApi.internalActions.onOnline.match(dispatchSpy.mock.calls[1][0] as AnyAction)).toBe(true);

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));

    unsubscribe();
    expect(consoleSpy).toHaveBeenCalledWith('cleanup!');
  });
});
