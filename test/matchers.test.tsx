import { createSlice, SerializedError } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query/react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  actionsReducer,
  expectExactType,
  hookWaitFor,
  matchSequence,
  notMatchSequence,
  setupApiStore,
} from './helpers';

interface ResultType {
  result: 'complex';
}

interface ArgType {
  foo: 'bar';
  count: 3;
}

const baseQuery = fetchBaseQuery({ baseUrl: 'http://example.com' });
const api = createApi({
  baseQuery,
  endpoints(build) {
    return {
      querySuccess: build.query<ResultType, ArgType>({ query: () => '/success' }),
      querySuccess2: build.query({ query: () => '/success' }),
      queryFail: build.query({ query: () => '/error' }),
      mutationSuccess: build.mutation({ query: () => ({ url: '/success', method: 'POST' }) }),
      mutationSuccess2: build.mutation({ query: () => ({ url: '/success', method: 'POST' }) }),
      mutationFail: build.mutation({ query: () => ({ url: '/error', method: 'POST' }) }),
    };
  },
});

const storeRef = setupApiStore(api, {
  ...actionsReducer,
});

const { mutationFail, mutationSuccess, mutationSuccess2, queryFail, querySuccess, querySuccess2 } = api.endpoints;

const otherEndpointMatchers = [
  mutationSuccess2.matchPending,
  mutationSuccess2.matchFulfilled,
  mutationSuccess2.matchRejected,
  querySuccess2.matchPending,
  querySuccess2.matchFulfilled,
  querySuccess2.matchRejected,
];

test('matches query pending & fulfilled actions for the given endpoint', async () => {
  const endpoint = querySuccess;
  const { result } = renderHook(() => endpoint.useQuery({} as any), { wrapper: storeRef.wrapper });
  await hookWaitFor(() => expect(result.current.isLoading).toBeFalsy());

  matchSequence(storeRef.store.getState().actions, endpoint.matchPending, endpoint.matchFulfilled);
  notMatchSequence(
    storeRef.store.getState().actions,
    [endpoint.matchFulfilled, endpoint.matchRejected, ...otherEndpointMatchers],
    [endpoint.matchPending, endpoint.matchRejected, ...otherEndpointMatchers]
  );
});
test('matches query pending & rejected actions for the given endpoint', async () => {
  const endpoint = queryFail;
  const { result } = renderHook(() => endpoint.useQuery({}), { wrapper: storeRef.wrapper });
  await hookWaitFor(() => expect(result.current.isLoading).toBeFalsy());

  matchSequence(storeRef.store.getState().actions, endpoint.matchPending, endpoint.matchRejected);
  notMatchSequence(
    storeRef.store.getState().actions,
    [endpoint.matchFulfilled, endpoint.matchRejected, ...otherEndpointMatchers],
    [endpoint.matchPending, endpoint.matchFulfilled, ...otherEndpointMatchers]
  );
});

test('matches lazy query pending & fulfilled actions for given endpoint', async () => {
  const endpoint = querySuccess;
  const { result } = renderHook(() => endpoint.useLazyQuery(), { wrapper: storeRef.wrapper });
  act(() => void result.current[0]({} as any));
  await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());

  matchSequence(storeRef.store.getState().actions, endpoint.matchPending, endpoint.matchFulfilled);
  notMatchSequence(
    storeRef.store.getState().actions,
    [endpoint.matchFulfilled, endpoint.matchRejected, ...otherEndpointMatchers],
    [endpoint.matchPending, endpoint.matchRejected, ...otherEndpointMatchers]
  );
});

test('matches lazy query pending & rejected actions for given endpoint', async () => {
  const endpoint = queryFail;
  const { result } = renderHook(() => endpoint.useLazyQuery(), { wrapper: storeRef.wrapper });
  act(() => void result.current[0]({}));
  await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());

  matchSequence(storeRef.store.getState().actions, endpoint.matchPending, endpoint.matchRejected);
  notMatchSequence(
    storeRef.store.getState().actions,
    [endpoint.matchFulfilled, endpoint.matchRejected, ...otherEndpointMatchers],
    [endpoint.matchPending, endpoint.matchFulfilled, ...otherEndpointMatchers]
  );
});

test('matches mutation pending & fulfilled actions for the given endpoint', async () => {
  const endpoint = mutationSuccess;
  const { result } = renderHook(() => endpoint.useMutation(), { wrapper: storeRef.wrapper });
  act(() => void result.current[0]({}));
  await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());

  matchSequence(storeRef.store.getState().actions, endpoint.matchPending, endpoint.matchFulfilled);
  notMatchSequence(
    storeRef.store.getState().actions,
    [endpoint.matchFulfilled, endpoint.matchRejected, ...otherEndpointMatchers],
    [endpoint.matchPending, endpoint.matchRejected, ...otherEndpointMatchers]
  );
});
test('matches mutation pending & rejected actions for the given endpoint', async () => {
  const endpoint = mutationFail;
  const { result } = renderHook(() => endpoint.useMutation(), { wrapper: storeRef.wrapper });
  act(() => void result.current[0]({}));
  await hookWaitFor(() => expect(result.current[1].isLoading).toBeFalsy());

  matchSequence(storeRef.store.getState().actions, endpoint.matchPending, endpoint.matchRejected);
  notMatchSequence(
    storeRef.store.getState().actions,
    [endpoint.matchFulfilled, endpoint.matchRejected, ...otherEndpointMatchers],
    [endpoint.matchPending, endpoint.matchFulfilled, ...otherEndpointMatchers]
  );
});

test('inferred types', () => {
  createSlice({
    name: 'auth',
    initialState: {},
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addMatcher(api.endpoints.querySuccess.matchPending, (state, action) => {
          expectExactType(undefined)(action.payload);
          // @ts-expect-error
          console.log(action.error);
          expectExactType({} as ArgType)(action.meta.arg.originalArgs);
        })
        .addMatcher(api.endpoints.querySuccess.matchFulfilled, (state, action) => {
          expectExactType({} as ResultType)(action.payload.result);
          expectExactType(0 as number)(action.payload.fulfilledTimeStamp);
          // @ts-expect-error
          console.log(action.error);
          expectExactType({} as ArgType)(action.meta.arg.originalArgs);
        })
        .addMatcher(api.endpoints.querySuccess.matchRejected, (state, action) => {
          expectExactType({} as SerializedError)(action.error);
          expectExactType({} as ArgType)(action.meta.arg.originalArgs);
        });
    },
  });
});
