import * as React from 'react';
import { createApi, fetchBaseQuery, QueryStatus } from '@rtk-incubator/rtk-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_DELAY_MS, setupApiStore, waitMs } from './helpers';
import { server } from './mocks/server';
import { rest } from 'msw';

// Just setup a temporary in-memory counter for tests that `getIncrementedAmount`.
// This can be used to test how many renders happen due to data changes or
// the refetching behavior of components.
let amount = 0;

const api = createApi({
  baseQuery: async (arg: any) => {
    await waitMs();
    if (arg?.body && 'amount' in arg.body) {
      amount += 1;
    }
    return { data: arg?.body ? { ...arg.body, ...(amount ? { amount } : {}) } : undefined };
  },
  endpoints: (build) => ({
    getUser: build.query<any, number>({
      query: (arg) => arg,
    }),
    getIncrementedAmount: build.query<any, void>({
      query: () => ({
        url: '',
        body: {
          amount,
        },
      }),
    }),
    updateUser: build.mutation<any, { name: string }>({
      query: (update) => ({ body: update }),
    }),
    getError: build.query({
      query: (query) => '/error',
    }),
  }),
});

const storeRef = setupApiStore(api);

afterEach(() => {
  amount = 0;
});

describe('hooks tests', () => {
  test('useQuery hook sets isFetching=true whenever a request is in flight', async () => {
    function User() {
      const [value, setValue] = React.useState(0);

      const { isFetching } = api.endpoints.getUser.useQuery(1, { skip: value < 1 });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    // Being that nothing has changed in the args, this should never fire.
    expect(getByTestId('isFetching').textContent).toBe('false');
  });

  test('useQuery hook sets isLoading=true only on initial request', async () => {
    let refetch: any, isLoading: boolean;
    function User() {
      const [value, setValue] = React.useState(0);

      ({ isLoading, refetch } = api.endpoints.getUser.useQuery(2, { skip: value < 1 }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    // Being that we skipped the initial request on mount, this should be false
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    // Condition is met, should load
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false')); // Make sure the original loading has completed.
    fireEvent.click(getByText('Increment value'));
    // Being that we already have data, isLoading should be false
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    // We call a refetch, should set to true
    act(() => refetch());
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
  });

  test('useQuery hook sets isLoading and isFetching to the correct states', async () => {
    let refetchMe: () => void = () => {};
    function User() {
      const [value, setValue] = React.useState(0);

      const { isLoading, isFetching, refetch } = api.endpoints.getUser.useQuery(22, { skip: value < 1 });
      refetchMe = refetch;
      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    fireEvent.click(getByText('Increment value'));
    // Condition is met, should load
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('true');
      expect(getByTestId('isFetching').textContent).toBe('true');
    });
    // Make sure the request is done for sure.
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    fireEvent.click(getByText('Increment value'));
    // Being that we already have data, isLoading should be false
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    // Make sure the request is done for sure.
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    // We call a refetch, should set both to true, then false when complete/errored
    act(() => refetchMe());
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('true');
      expect(getByTestId('isFetching').textContent).toBe('true');
    });
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
  });

  test('useQuery hook respects refetchOnMountOrArgChange: true', async () => {
    let data, isLoading, isFetching;
    function User() {
      ({ data, isLoading, isFetching } = api.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnMountOrArgChange: true,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId, unmount } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    unmount();

    ({ getByTestId } = render(<User />, { wrapper: storeRef.wrapper }));
    // Let's make sure we actually fetch, and we increment
    expect(getByTestId('isLoading').textContent).toBe('false');
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });

  test('useQuery does not refetch when refetchOnMountOrArgChange: NUMBER condition is not met', async () => {
    let data, isLoading, isFetching;
    function User() {
      ({ data, isLoading, isFetching } = api.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnMountOrArgChange: 10,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId, unmount } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    unmount();

    ({ getByTestId } = render(<User />, { wrapper: storeRef.wrapper }));
    // Let's make sure we actually fetch, and we increment. Should be false because we do this immediately
    // and the condition is set to 10 seconds
    expect(getByTestId('isFetching').textContent).toBe('false');
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));
  });

  test('useQuery refetches when refetchOnMountOrArgChange: NUMBER condition is met', async () => {
    let data, isLoading, isFetching;
    function User() {
      ({ data, isLoading, isFetching } = api.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnMountOrArgChange: 0.5,
      }));
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId, unmount } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    unmount();

    // Wait to make sure we've passed the `refetchOnMountOrArgChange` value
    await waitMs(510);

    ({ getByTestId } = render(<User />, { wrapper: storeRef.wrapper }));
    // Let's make sure we actually fetch, and we increment
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });

  test('refetchOnMountOrArgChange works as expected when changing skip from false->true', async () => {
    let data, isLoading, isFetching;
    function User() {
      const [skip, setSkip] = React.useState(true);
      ({ data, isLoading, isFetching } = api.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnMountOrArgChange: 0.5,
        skip,
      }));

      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
          <button onClick={() => setSkip((prev) => !prev)}>change skip</button>;
        </div>
      );
    }

    let { getByTestId, getByText } = render(<User />, { wrapper: storeRef.wrapper });

    expect(getByTestId('isLoading').textContent).toBe('false');
    expect(getByTestId('amount').textContent).toBe('undefined');

    fireEvent.click(getByText('change skip'));

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));
  });

  test('refetchOnMountOrArgChange works as expected when changing skip from false->true with a cached query', async () => {
    // 1. we need to mount a skipped query, then toggle skip to generate a cached result
    // 2. we need to mount a skipped component after that, then toggle skip as well. should pull from the cache.
    // 3. we need to mount another skipped component, then toggle skip after the specified duration and expect the time condition to be satisfied

    let data, isLoading, isFetching;
    function User() {
      const [skip, setSkip] = React.useState(true);
      ({ data, isLoading, isFetching } = api.endpoints.getIncrementedAmount.useQuery(undefined, {
        skip,
        refetchOnMountOrArgChange: 0.5,
      }));

      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
          <button onClick={() => setSkip((prev) => !prev)}>change skip</button>;
        </div>
      );
    }

    let { getByTestId, getByText, unmount } = render(<User />, { wrapper: storeRef.wrapper });

    // skipped queries do nothing by default, so we need to toggle that to get a cached result
    fireEvent.click(getByText('change skip'));

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    unmount();

    await waitMs(100);

    // This will pull from the cache as the time criteria is not met.
    ({ getByTestId, getByText, unmount } = render(<User />, {
      wrapper: storeRef.wrapper,
    }));

    // skipped queries return nothing
    expect(getByTestId('isFetching').textContent).toBe('false');
    expect(getByTestId('amount').textContent).toBe('undefined');

    // toggle skip -> true... won't refetch as the time critera is not met, and just loads the cached values
    fireEvent.click(getByText('change skip'));
    expect(getByTestId('isFetching').textContent).toBe('false');
    expect(getByTestId('amount').textContent).toBe('1');

    unmount();

    await waitMs(500);

    ({ getByTestId, getByText, unmount } = render(<User />, {
      wrapper: storeRef.wrapper,
    }));

    // toggle skip -> true... will cause a refetch as the time criteria is now satisfied
    fireEvent.click(getByText('change skip'));

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });

  test('useMutation hook sets and unsets the `isLoading` flag when running', async () => {
    function User() {
      const [updateUser, { isLoading }] = api.endpoints.updateUser.useMutation();

      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => updateUser({ name: 'Banana' })}>Update User</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    fireEvent.click(getByText('Update User'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
  });

  test('useMutation hook sets data to the resolved response on success', async () => {
    const result = { name: 'Banana' };

    function User() {
      const [updateUser, { data }] = api.endpoints.updateUser.useMutation();

      return (
        <div>
          <div data-testid="result">{JSON.stringify(data)}</div>
          <button onClick={() => updateUser({ name: 'Banana' })}>Update User</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    fireEvent.click(getByText('Update User'));
    await waitFor(() => expect(getByTestId('result').textContent).toBe(JSON.stringify(result)));
  });

  test('usePrefetch respects force arg', async () => {
    const { usePrefetch } = api;
    const USER_ID = 4;
    function User() {
      const { isFetching } = api.endpoints.getUser.useQuery(USER_ID);
      const prefetchUser = usePrefetch('getUser', { force: true });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onMouseEnter={() => prefetchUser(USER_ID, { force: true })} data-testid="highPriority">
            High priority action intent
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    // Resolve initial query
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    userEvent.hover(getByTestId('highPriority'));
    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      error: undefined,
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: true,
      isSuccess: false,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: QueryStatus.pending,
    });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitMs(DEFAULT_DELAY_MS + 100);

    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: QueryStatus.fulfilled,
    });
  });

  test('usePrefetch does not make an additional request if already in the cache and force=false', async () => {
    const { usePrefetch } = api;
    const USER_ID = 2;

    function User() {
      // Load the initial query
      const { isFetching } = api.endpoints.getUser.useQuery(USER_ID);
      const prefetchUser = usePrefetch('getUser', { force: false });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onMouseEnter={() => prefetchUser(USER_ID)} data-testid="lowPriority">
            Low priority user action intent
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    // Let the initial query resolve
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    // Try to prefetch what we just loaded
    userEvent.hover(getByTestId('lowPriority'));

    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: QueryStatus.fulfilled,
    });

    await waitMs();

    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: QueryStatus.fulfilled,
    });
  });

  test('usePrefetch respects `ifOlderThan` when it evaluates to `true`', async () => {
    const { usePrefetch } = api;
    const USER_ID = 47;

    function User() {
      // Load the initial query
      const { isFetching } = api.endpoints.getUser.useQuery(USER_ID);
      const prefetchUser = usePrefetch('getUser', { ifOlderThan: 0.2 });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onMouseEnter={() => prefetchUser(USER_ID)} data-testid="lowPriority">
            Low priority user action intent
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    // Wait 400ms, making it respect ifOlderThan
    await waitMs(400);

    // This should run the query being that we're past the threshold
    userEvent.hover(getByTestId('lowPriority'));
    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: true,
      isSuccess: false,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: QueryStatus.pending,
    });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: QueryStatus.fulfilled,
    });
  });

  test('usePrefetch returns the last success result when `ifOlderThan` evalutes to `false`', async () => {
    const { usePrefetch } = api;
    const USER_ID = 2;

    function User() {
      // Load the initial query
      const { isFetching } = api.endpoints.getUser.useQuery(USER_ID);
      const prefetchUser = usePrefetch('getUser', { ifOlderThan: 10 });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onMouseEnter={() => prefetchUser(USER_ID)} data-testid="lowPriority">
            Low priority user action intent
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitMs();

    // Get a snapshot of the last result
    const latestQueryData = api.endpoints.getUser.select(USER_ID)(storeRef.store.getState());

    userEvent.hover(getByTestId('lowPriority'));
    //  Serve up the result from the cache being that the condition wasn't met
    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual(latestQueryData);
  });

  test('usePrefetch executes a query even if conditions fail when the cache is empty', async () => {
    const { usePrefetch } = api;
    const USER_ID = 2;

    function User() {
      const prefetchUser = usePrefetch('getUser', { ifOlderThan: 10 });

      return (
        <div>
          <button onMouseEnter={() => prefetchUser(USER_ID)} data-testid="lowPriority">
            Low priority user action intent
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    userEvent.hover(getByTestId('lowPriority'));

    expect(api.endpoints.getUser.select(USER_ID)(storeRef.store.getState())).toEqual({
      endpoint: 'getUser',
      internalQueryArgs: USER_ID,
      isError: false,
      isLoading: true,
      isSuccess: false,
      isUninitialized: false,
      originalArgs: USER_ID,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: 'pending',
    });
  });
});

describe('hooks with createApi defaults set', () => {
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
    refetchOnMountOrArgChange: true,
  });

  const storeRef = setupApiStore(defaultApi);
  test('useQuery hook respects refetchOnMountOrArgChange: true when set in createApi options', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery());
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId, unmount } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    unmount();

    function OtherUser() {
      ({ data, isFetching } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnMountOrArgChange: true,
      }));
      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    ({ getByTestId } = render(<OtherUser />, { wrapper: storeRef.wrapper }));
    // Let's make sure we actually fetch, and we increment
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('2'));
  });

  test('useQuery hook overrides default refetchOnMountOrArgChange: false that was set by createApi', async () => {
    let data, isLoading, isFetching;

    function User() {
      ({ data, isLoading } = defaultApi.endpoints.getIncrementedAmount.useQuery());
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    let { getByTestId, unmount } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));

    unmount();

    function OtherUser() {
      ({ data, isFetching } = defaultApi.endpoints.getIncrementedAmount.useQuery(undefined, {
        refetchOnMountOrArgChange: false,
      }));
      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="amount">{String(data?.amount)}</div>
        </div>
      );
    }

    ({ getByTestId } = render(<OtherUser />, { wrapper: storeRef.wrapper }));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));

    await waitFor(() => expect(getByTestId('amount').textContent).toBe('1'));
  });

  describe('subSelector behaviors', () => {
    let startingId = 3;
    const initialPosts = [
      { id: 1, name: 'A sample post', fetched_at: new Date().toUTCString() },
      { id: 2, name: 'A post about rtk-query', fetched_at: new Date().toUTCString() },
    ];
    let posts = [] as typeof initialPosts;

    beforeEach(() => {
      startingId = 3;
      posts = [...initialPosts];

      const handlers = [
        rest.get('http://example.com/posts', (req, res, ctx) => {
          return res(ctx.json(posts));
        }),
        rest.put<Partial<Post>>('http://example.com/posts/:id', (req, res, ctx) => {
          const id = Number(req.params.id);
          const idx = posts.findIndex((post) => post.id === id);

          const newPosts = posts.map((post, index) =>
            index !== idx
              ? post
              : {
                  ...req.body,
                  id,
                  name: req.body.name || post.name,
                  fetched_at: new Date().toUTCString(),
                }
          );
          posts = [...newPosts];

          return res(ctx.json(posts));
        }),
        rest.post('http://example.com/posts', (req, res, ctx) => {
          let post = req.body as Omit<Post, 'id'>;
          startingId += 1;
          posts.concat({ ...post, fetched_at: new Date().toISOString(), id: startingId });
          return res(ctx.json(posts));
        }),
      ];

      server.use(...handlers);
    });

    interface Post {
      id: number;
      name: string;
      fetched_at: string;
    }

    type PostsResponse = Post[];

    const api = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'http://example.com/' }),
      entityTypes: ['Posts'],
      endpoints: (build) => ({
        getPosts: build.query<PostsResponse, void>({
          query: () => ({ url: 'posts' }),
          provides: (result) => [...result.map(({ id }) => ({ type: 'Posts', id } as const))],
        }),
        updatePost: build.mutation<Post, Partial<Post>>({
          query: ({ id, ...body }) => ({
            url: `posts/${id}`,
            method: 'PUT',
            body,
          }),
          invalidates: ({ id }) => [{ type: 'Posts', id }],
        }),
        addPost: build.mutation<Post, Partial<Post>>({
          query: (body) => ({
            url: `posts`,
            method: 'POST',
            body,
          }),
          invalidates: ['Posts'],
        }),
      }),
    });

    const storeRef = setupApiStore(api);

    test('useQueryState serves a deeply memoized value and does not rerender unnecessarily', async () => {
      function Posts() {
        const { data: posts } = api.useGetPostsQuery();
        const [addPost] = api.useAddPostMutation();
        return (
          <div>
            <button data-testid="addPost" onClick={() => addPost({ name: `some text ${posts?.length}` })}>
              Add random post
            </button>
          </div>
        );
      }

      function SelectedPost() {
        const [renderCount, setRenderCount] = React.useState(0);
        const { post } = api.endpoints.getPosts.useQueryState(undefined, {
          subSelector: ({ data }) => ({ post: data?.find((post) => post.id === 1) }),
        });

        /**
         * Notes on the renderCount behavior
         *
         * We initialize at 0, and the first render will bump that 1 while post is `undefined`.
         * Once the request resolves, it will be at 2. What we're looking for is to make sure that
         * any requests that don't directly change the value of the selected item will have no impact
         * on rendering.
         */

        React.useEffect(() => {
          setRenderCount((prev) => prev + 1);
        }, [post]);

        return <div data-testid="renderCount">{String(renderCount)}</div>;
      }

      const { getByTestId } = render(
        <div>
          <Posts />
          <SelectedPost />
        </div>,
        { wrapper: storeRef.wrapper }
      );
      expect(getByTestId('renderCount').textContent).toBe('1');

      const addBtn = getByTestId('addPost');

      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));

      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));
      // We fire off a few requests that would typically cause a rerender as JSON.parse() on a request would always be a new object.
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));
      // Being that it didn't rerender, we can be assured that the behavior is correct
    });

    test('useQuery with subSelector option serves a deeply memoized value and does not rerender unnecessarily', async () => {
      function Posts() {
        const { data: posts } = api.useGetPostsQuery();
        const [addPost] = api.useAddPostMutation();
        return (
          <div>
            <button
              data-testid="addPost"
              onClick={() => addPost({ name: `some text ${posts?.length}`, fetched_at: new Date().toISOString() })}
            >
              Add random post
            </button>
          </div>
        );
      }

      function SelectedPost() {
        const [renderCount, setRenderCount] = React.useState(0);
        const { post } = api.useGetPostsQuery(undefined, {
          subSelector: ({ data }) => ({ post: data?.find((post) => post.id === 1) }),
        });

        React.useEffect(() => {
          setRenderCount((prev) => prev + 1);
        }, [post]);

        return <div data-testid="renderCount">{String(renderCount)}</div>;
      }

      const { getByTestId } = render(
        <div>
          <Posts />
          <SelectedPost />
        </div>,
        { wrapper: storeRef.wrapper }
      );
      expect(getByTestId('renderCount').textContent).toBe('1');

      const addBtn = getByTestId('addPost');

      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));

      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));
    });

    test('useQuery with subSelector option serves a deeply memoized value, then ONLY updates when the underlying data changes', async () => {
      let expectablePost: Post | undefined;
      function Posts() {
        const { data: posts } = api.useGetPostsQuery();
        const [addPost] = api.useAddPostMutation();
        const [updatePost] = api.useUpdatePostMutation();

        return (
          <div>
            <button
              data-testid="addPost"
              onClick={() => addPost({ name: `some text ${posts?.length}`, fetched_at: new Date().toISOString() })}
            >
              Add random post
            </button>
            <button data-testid="updatePost" onClick={() => updatePost({ id: 1, name: 'supercoooll!' })}>
              Update post
            </button>
          </div>
        );
      }

      function SelectedPost() {
        const [renderCount, setRenderCount] = React.useState(0);
        const { post } = api.useGetPostsQuery(undefined, {
          subSelector: ({ data }) => ({ post: data?.find((post) => post.id === 1) }),
        });

        React.useEffect(() => {
          setRenderCount((prev) => prev + 1);
          expectablePost = post;
        }, [post]);

        return (
          <div>
            <div data-testid="postName">{post?.name}</div>
            <div data-testid="renderCount">{String(renderCount)}</div>
          </div>
        );
      }

      const { getByTestId } = render(
        <div>
          <Posts />
          <SelectedPost />
        </div>,
        { wrapper: storeRef.wrapper }
      );
      expect(getByTestId('renderCount').textContent).toBe('1');

      const addBtn = getByTestId('addPost');
      const updateBtn = getByTestId('updatePost');

      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('2'));

      fireEvent.click(updateBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('3'));
      expect(expectablePost?.name).toBe('supercoooll!');

      fireEvent.click(addBtn);
      await waitFor(() => expect(getByTestId('renderCount').textContent).toBe('3'));
    });
  });
});
