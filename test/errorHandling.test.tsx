import * as React from 'react';
import { BaseQueryFn, createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { rest } from 'msw';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { expectExactType, hookWaitFor, setupApiStore } from './helpers';
import { server } from './mocks/server';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';

const baseQuery = fetchBaseQuery({ baseUrl: 'http://example.com' });

const api = createApi({
  baseQuery,
  endpoints(build) {
    return {
      query: build.query({ query: () => '/query' }),
      mutation: build.mutation({ query: () => ({ url: '/mutation', method: 'POST' }) }),
    };
  },
});

const storeRef = setupApiStore(api);

const failQueryOnce = rest.get('/query', (_, req, ctx) => req.once(ctx.status(500), ctx.json({ value: 'failed' })));

describe('fetchBaseQuery', () => {
  test('success', async () => {
    await expect(
      baseQuery(
        '/success',
        { signal: undefined, dispatch: storeRef.store.dispatch, getState: storeRef.store.getState },
        {}
      )
    ).resolves.toEqual({
      data: { value: 'success' },
    });
  });
  test('error', async () => {
    server.use(failQueryOnce);
    await expect(
      baseQuery(
        '/error',
        { signal: undefined, dispatch: storeRef.store.dispatch, getState: storeRef.store.getState },
        {}
      )
    ).resolves.toEqual({
      error: { data: { value: 'error' }, status: 500 },
    });
  });
});

describe('query error handling', () => {
  test('success', async () => {
    server.use(rest.get('http://example.com/query', (_, res, ctx) => res(ctx.json({ value: 'success' }))));

    const { result } = renderHook(() => api.useQueryQuery({}), { wrapper: storeRef.wrapper });

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: { value: 'success' },
      })
    );
  });

  test('error', async () => {
    server.use(
      rest.get('http://example.com/query', (_, res, ctx) => res(ctx.status(500), ctx.json({ value: 'error' })))
    );

    const { result } = renderHook(() => api.useQueryQuery({}), { wrapper: storeRef.wrapper });

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: { status: 500, data: { value: 'error' } },
      })
    );
  });

  test('success -> error', async () => {
    server.use(rest.get('http://example.com/query', (_, res, ctx) => res(ctx.json({ value: 'success' }))));

    const { result } = renderHook(() => api.useQueryQuery({}), { wrapper: storeRef.wrapper });

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: { value: 'success' },
      })
    );

    server.use(
      rest.get('http://example.com/query', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' })))
    );

    act(result.current.refetch);

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: { status: 500, data: { value: 'error' } },
        // last data will stay available
        data: { value: 'success' },
      })
    );
  });

  test('error -> success', async () => {
    server.use(rest.get('http://example.com/query', (_, res, ctx) => res(ctx.json({ value: 'success' }))));
    server.use(
      rest.get('http://example.com/query', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' })))
    );

    const { result } = renderHook(() => api.useQueryQuery({}), { wrapper: storeRef.wrapper });

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: { status: 500, data: { value: 'error' } },
      })
    );

    act(result.current.refetch);

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: { value: 'success' },
        error: undefined,
      })
    );
  });
});

describe('mutation error handling', () => {
  test('success', async () => {
    server.use(rest.post('http://example.com/mutation', (_, res, ctx) => res(ctx.json({ value: 'success' }))));

    const { result } = renderHook(() => api.useMutationMutation(), { wrapper: storeRef.wrapper });

    const [trigger] = result.current;

    act(() => void trigger({}));

    await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());
    expect(result.current[1]).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: { value: 'success' },
      })
    );
  });

  test('error', async () => {
    server.use(
      rest.post('http://example.com/mutation', (_, res, ctx) => res(ctx.status(500), ctx.json({ value: 'error' })))
    );

    const { result } = renderHook(() => api.useMutationMutation(), { wrapper: storeRef.wrapper });

    const [trigger] = result.current;

    act(() => void trigger({}));

    await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());
    expect(result.current[1]).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: { status: 500, data: { value: 'error' } },
      })
    );
  });

  test('success -> error', async () => {
    server.use(rest.post('http://example.com/mutation', (_, res, ctx) => res(ctx.json({ value: 'success' }))));

    const { result } = renderHook(() => api.useMutationMutation(), { wrapper: storeRef.wrapper });

    {
      const [trigger] = result.current;

      act(() => void trigger({}));

      await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());
      expect(result.current[1]).toEqual(
        expect.objectContaining({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: { value: 'success' },
        })
      );
    }

    server.use(
      rest.post('http://example.com/mutation', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' })))
    );

    {
      const [trigger] = result.current;

      act(() => void trigger({}));

      await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());
      expect(result.current[1]).toEqual(
        expect.objectContaining({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: { status: 500, data: { value: 'error' } },
        })
      );
      expect(result.current[1].data).toBeUndefined();
    }
  });

  test('error -> success', async () => {
    server.use(rest.post('http://example.com/mutation', (_, res, ctx) => res(ctx.json({ value: 'success' }))));
    server.use(
      rest.post('http://example.com/mutation', (_, res, ctx) => res.once(ctx.status(500), ctx.json({ value: 'error' })))
    );

    const { result } = renderHook(() => api.useMutationMutation(), { wrapper: storeRef.wrapper });

    {
      const [trigger] = result.current;

      act(() => void trigger({}));

      await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());
      expect(result.current[1]).toEqual(
        expect.objectContaining({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: { status: 500, data: { value: 'error' } },
        })
      );
    }

    {
      const [trigger] = result.current;

      act(() => void trigger({}));

      await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());
      expect(result.current[1]).toEqual(
        expect.objectContaining({
          isLoading: false,
          isError: false,
          isSuccess: true,
        })
      );
      expect(result.current[1].error).toBeUndefined();
    }
  });
});

describe('custom axios baseQuery', () => {
  const axiosBaseQuery = (
    { baseUrl }: { baseUrl: string } = { baseUrl: '' }
  ): BaseQueryFn<
    {
      url: string;
      method: AxiosRequestConfig['method'];
      data?: AxiosRequestConfig['data'];
    },
    unknown,
    unknown
  > => async ({ url, method, data }) => {
    try {
      const result = await axios({ url: baseUrl + url, method, data });
      return { data: result.data };
    } catch (axiosError) {
      let err = axiosError as AxiosError;
      return { error: { status: err.response?.status, data: err.response?.data } };
    }
  };

  const api = createApi({
    baseQuery: axiosBaseQuery({
      baseUrl: 'http://example.com',
    }),
    endpoints(build) {
      return {
        query: build.query({ query: () => ({ url: '/query', method: 'get' }) }),
        mutation: build.mutation({ query: () => ({ url: '/mutation', method: 'post' }) }),
      };
    },
  });

  const storeRef = setupApiStore(api);
  test('axios errors behave as expected', async () => {
    server.use(
      rest.get('http://example.com/query', (_, res, ctx) => res(ctx.status(500), ctx.json({ value: 'error' })))
    );

    const { result } = renderHook(() => api.useQueryQuery({}), { wrapper: storeRef.wrapper });

    await hookWaitFor(() => expect(result.current.isFetching).toBeFalsy());
    expect(result.current).toEqual(
      expect.objectContaining({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: { status: 500, data: { value: 'error' } },
      })
    );
  });
});

describe('error handling in a component', () => {
  const mockErrorResponse = { value: 'error', very: 'mean' };
  const mockSuccessResponse = { value: 'success' };

  const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: 'http://example.com' }),
    endpoints: (build) => ({
      update: build.mutation<typeof mockSuccessResponse, any>({
        query: () => ({ url: 'success' }),
      }),
      failedUpdate: build.mutation<typeof mockSuccessResponse, any>({
        query: () => ({ url: 'error' }),
      }),
    }),
  });
  const storeRef = setupApiStore(api);

  test('a mutation is unwrappable and has the correct types', async () => {
    server.use(
      rest.get('http://example.com/success', (_, res, ctx) => res.once(ctx.status(500), ctx.json(mockErrorResponse)))
    );

    function User() {
      const [manualError, setManualError] = React.useState<any>();
      const [update, { isLoading, data, error }] = api.useUpdateMutation();

      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <div data-testid="data">{JSON.stringify(data)}</div>
          <div data-testid="error">{JSON.stringify(error)}</div>
          <div data-testid="manuallySetError">{JSON.stringify(manualError)}</div>
          <button
            onClick={() => {
              update({ name: 'hello' })
                .unwrap()
                .then((result) => {
                  expectExactType(mockSuccessResponse)(result);
                  setManualError(undefined);
                })
                .catch((error) => setManualError(error));
            }}
          >
            Update User
          </button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: storeRef.wrapper });

    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    fireEvent.click(getByText('Update User'));
    expect(getByTestId('isLoading').textContent).toBe('true');
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));

    // Make sure the hook and the unwrapped action return the same things in an error state
    expect(getByTestId('error').textContent).toEqual(getByTestId('manuallySetError').textContent);

    fireEvent.click(getByText('Update User'));
    expect(getByTestId('isLoading').textContent).toBe('true');
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('error').textContent).toBeFalsy());
    await waitFor(() => expect(getByTestId('manuallySetError').textContent).toBeFalsy());
    await waitFor(() => expect(getByTestId('data').textContent).toEqual(JSON.stringify(mockSuccessResponse)));
  });

  for (const track of [true, false]) {
    test(`an un-subscribed mutation will still return something useful (success case, track: ${track})`, async () => {
      const hook = renderHook(useDispatch, { wrapper: storeRef.wrapper });

      const dispatch = hook.result.current as ThunkDispatch<any, any, AnyAction>;
      let mutationResultPromise: ReturnType<ReturnType<typeof api.endpoints.update.initiate>>;
      act(() => {
        mutationResultPromise = dispatch(api.endpoints.update.initiate({}, { track }));
      });
      const result = await mutationResultPromise!;
      expect(result).toMatchObject({
        data: { value: 'success' },
      });
    });

    test(`an un-subscribed mutation will still return something useful (error case, track: ${track})`, async () => {
      const hook = renderHook(useDispatch, { wrapper: storeRef.wrapper });

      const dispatch = hook.result.current as ThunkDispatch<any, any, AnyAction>;
      let mutationResultPromise: ReturnType<ReturnType<typeof api.endpoints.failedUpdate.initiate>>;
      act(() => {
        mutationResultPromise = dispatch(api.endpoints.failedUpdate.initiate({}, { track }));
      });
      const result = await mutationResultPromise!;
      expect(result).toMatchObject({
        error: { status: 500, data: { value: 'error' } },
      });
    });
    test(`an un-subscribed mutation will still be unwrappable (success case), track: ${track}`, async () => {
      const hook = renderHook(useDispatch, { wrapper: storeRef.wrapper });

      const dispatch = hook.result.current as ThunkDispatch<any, any, AnyAction>;
      let mutationResultPromise: ReturnType<ReturnType<typeof api.endpoints.update.initiate>>;
      act(() => {
        mutationResultPromise = dispatch(api.endpoints.update.initiate({}, { track }));
      });
      const result = await mutationResultPromise!.unwrap();
      expect(result).toMatchObject({
        value: 'success',
      });
    });

    test(`an un-subscribed mutation will still be unwrappable (error case, track: ${track})`, async () => {
      const hook = renderHook(useDispatch, { wrapper: storeRef.wrapper });

      const dispatch = hook.result.current as ThunkDispatch<any, any, AnyAction>;
      let mutationResultPromise: ReturnType<ReturnType<typeof api.endpoints.failedUpdate.initiate>>;
      act(() => {
        mutationResultPromise = dispatch(api.endpoints.failedUpdate.initiate({}, { track }));
      });
      const unwrappedPromise = mutationResultPromise!.unwrap();
      expect(unwrappedPromise).rejects.toMatchObject({ status: 500, data: { value: 'error' } });
    });
  }
});
