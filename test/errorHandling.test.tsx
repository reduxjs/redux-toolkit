import { BaseQueryFn, createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { rest } from 'msw';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { hookWaitFor, setupApiStore } from './helpers';
import { server } from './mocks/server';

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
