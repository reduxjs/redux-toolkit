import * as React from 'react';
import { createApi, QueryStatus } from '@rtk-incubator/rtk-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_DELAY_MS, setupApiStore, waitMs } from './helpers';

const api = createApi({
  baseQuery: async (arg: any) => {
    await waitMs();
    return { data: arg?.body ? arg.body : undefined };
  },
  endpoints: (build) => ({
    getUser: build.query<any, number>({
      query: (arg) => arg,
    }),
    updateUser: build.mutation<any, { name: string }>({
      query: (update) => ({ body: update }),
    }),
  }),
});
const storeRef = setupApiStore(api);

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
    let refetchMe: () => void = () => {};
    function User() {
      const [value, setValue] = React.useState(0);

      const { isLoading, refetch } = api.endpoints.getUser.useQuery(2, { skip: value < 1 });
      refetchMe = refetch;
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
    act(() => refetchMe());
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

  test('usePrefetch respects `force` arg', async () => {
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
