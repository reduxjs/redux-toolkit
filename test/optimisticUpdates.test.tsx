import { AnyAction } from '@reduxjs/toolkit';
import { createApi } from '@rtk-incubator/rtk-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { hookWaitFor, setupApiStore, waitMs } from './helpers';
import { Patch } from 'immer';

interface Post {
  id: string;
  title: string;
  contents: string;
}

const baseQuery = jest.fn();
beforeEach(() => baseQuery.mockReset());

const api = createApi({
  baseQuery,
  entityTypes: ['Post'],
  endpoints: (build) => ({
    post: build.query<Post, string>({ query: (id) => `post/${id}`, provides: ['Post'] }),
    updatePost: build.mutation<void, Pick<Post, 'id'> & Partial<Post>, { undoPost: Patch[] }>({
      query: ({ id, ...patch }) => ({ url: `post/${id}`, method: 'PATCH', body: patch }),
      onStart({ id, ...patch }, { dispatch, context }) {
        context.undoPost = dispatch(
          api.util.updateQueryResult('post', id, (draft) => {
            Object.assign(draft, patch);
          })
        ).inversePatches;
      },
      onError({ id }, { dispatch, context }) {
        dispatch(api.util.patchQueryResult('post', id, context.undoPost));
      },
      invalidates: ['Post'],
    }),
  }),
});

const storeRef = setupApiStore(api, {
  actions(state: AnyAction[] = [], action: AnyAction) {
    return [...state, action];
  },
});

describe('basic lifecycle', () => {
  let onStart = jest.fn(),
    onError = jest.fn(),
    onSuccess = jest.fn();

  const extendedApi = api.injectEndpoints({
    endpoints: (build) => ({
      test: build.mutation({
        query: (x) => x,
        onStart,
        onError,
        onSuccess,
      }),
    }),
    overrideExisting: true,
  });

  beforeEach(() => {
    onStart.mockReset();
    onError.mockReset();
    onSuccess.mockReset();
  });

  test('success', async () => {
    const { result } = renderHook(() => extendedApi.hooks.useTestMutation(), {
      wrapper: storeRef.wrapper,
    });

    baseQuery.mockResolvedValue('success');

    expect(onStart).not.toHaveBeenCalled();
    expect(baseQuery).not.toHaveBeenCalled();
    act(() => void result.current[0]('arg'));
    expect(onStart).toHaveBeenCalledWith('arg', expect.any(Object));
    expect(baseQuery).toHaveBeenCalledWith('arg', expect.any(Object));

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    await act(() => waitMs(5));
    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith('arg', expect.any(Object), 'success');
  });

  test('error', async () => {
    const { result } = renderHook(() => extendedApi.hooks.useTestMutation(), {
      wrapper: storeRef.wrapper,
    });

    baseQuery.mockRejectedValue('error');

    expect(onStart).not.toHaveBeenCalled();
    expect(baseQuery).not.toHaveBeenCalled();
    act(() => void result.current[0]('arg'));
    expect(onStart).toHaveBeenCalledWith('arg', expect.any(Object));
    expect(baseQuery).toHaveBeenCalledWith('arg', expect.any(Object));

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    await act(() => waitMs(5));
    expect(onError).toHaveBeenCalledWith('arg', expect.any(Object), 'error');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('updateQueryResult', () => {
  test('updates cache values, can apply inverse patch', async () => {
    baseQuery.mockResolvedValueOnce({ id: '3', title: 'All about cheese.', contents: 'TODO' });

    const { result } = renderHook(() => api.hooks.usePostQuery('3'), {
      wrapper: storeRef.wrapper,
    });
    await hookWaitFor(() => expect(result.current.isSuccess).toBeTruthy());

    const dataBefore = result.current.data;
    expect(dataBefore).toEqual({ id: '3', title: 'All about cheese.', contents: 'TODO' });

    let returnValue!: ReturnType<ReturnType<typeof api.util.updateQueryResult>>;
    act(() => {
      returnValue = storeRef.store.dispatch(
        api.util.updateQueryResult('post', '3', (draft) => {
          draft.contents = 'I love cheese!';
        })
      );
    });

    expect(result.current.data).not.toBe(dataBefore);
    expect(result.current.data).toEqual({ id: '3', title: 'All about cheese.', contents: 'I love cheese!' });

    expect(returnValue).toEqual({
      inversePatches: [{ op: 'replace', path: ['contents'], value: 'TODO' }],
      patches: [{ op: 'replace', path: ['contents'], value: 'I love cheese!' }],
    });

    act(() => {
      returnValue = storeRef.store.dispatch(api.util.patchQueryResult('post', '3', returnValue.inversePatches));
    });

    expect(result.current.data).toEqual(dataBefore);
  });

  test('does not update non-existing values', async () => {
    baseQuery.mockResolvedValueOnce({ id: '3', title: 'All about cheese.', contents: 'TODO' });

    const { result } = renderHook(() => api.hooks.usePostQuery('3'), {
      wrapper: storeRef.wrapper,
    });
    await hookWaitFor(() => expect(result.current.isSuccess).toBeTruthy());

    const dataBefore = result.current.data;
    expect(dataBefore).toEqual({ id: '3', title: 'All about cheese.', contents: 'TODO' });

    let returnValue!: ReturnType<ReturnType<typeof api.util.updateQueryResult>>;
    act(() => {
      returnValue = storeRef.store.dispatch(
        api.util.updateQueryResult('post', '4', (draft) => {
          draft.contents = 'I love cheese!';
        })
      );
    });

    expect(result.current.data).toBe(dataBefore);

    expect(returnValue).toEqual({
      inversePatches: [],
      patches: [],
    });
  });
});

describe('full integration', () => {
  test('success case', async () => {
    baseQuery
      .mockResolvedValueOnce({ id: '3', title: 'All about cheese.', contents: 'TODO' })
      .mockResolvedValueOnce({ id: '3', title: 'Meanwhile, this changed server-side.', contents: 'Delicious cheese!' })
      .mockResolvedValueOnce({ id: '3', title: 'Meanwhile, this changed server-side.', contents: 'Delicious cheese!' });
    const { result } = renderHook(
      () => ({
        query: api.hooks.usePostQuery('3'),
        mutation: api.hooks.useUpdatePostMutation(),
      }),
      {
        wrapper: storeRef.wrapper,
      }
    );
    await hookWaitFor(() => expect(result.current.query.isSuccess).toBeTruthy());

    expect(result.current.query.data).toEqual({ id: '3', title: 'All about cheese.', contents: 'TODO' });

    act(() => {
      result.current.mutation[0]({ id: '3', contents: 'Delicious cheese!' });
    });

    expect(result.current.query.data).toEqual({ id: '3', title: 'All about cheese.', contents: 'Delicious cheese!' });

    await hookWaitFor(() =>
      expect(result.current.query.data).toEqual({
        id: '3',
        title: 'Meanwhile, this changed server-side.',
        contents: 'Delicious cheese!',
      })
    );
  });

  test('error case', async () => {
    baseQuery
      .mockResolvedValueOnce({ id: '3', title: 'All about cheese.', contents: 'TODO' })
      .mockRejectedValueOnce('some error!')
      .mockResolvedValueOnce({ id: '3', title: 'Meanwhile, this changed server-side.', contents: 'TODO' });

    const { result } = renderHook(
      () => ({
        query: api.hooks.usePostQuery('3'),
        mutation: api.hooks.useUpdatePostMutation(),
      }),
      {
        wrapper: storeRef.wrapper,
      }
    );
    await hookWaitFor(() => expect(result.current.query.isSuccess).toBeTruthy());

    expect(result.current.query.data).toEqual({ id: '3', title: 'All about cheese.', contents: 'TODO' });

    act(() => {
      result.current.mutation[0]({ id: '3', contents: 'Delicious cheese!' });
    });

    // optimistic update
    expect(result.current.query.data).toEqual({ id: '3', title: 'All about cheese.', contents: 'Delicious cheese!' });

    // rollback
    await hookWaitFor(() =>
      expect(result.current.query.data).toEqual({
        id: '3',
        title: 'All about cheese.',
        contents: 'TODO',
      })
    );

    // mutation failed - will not invalidate query and not refetch data from the server
    await expect(() =>
      hookWaitFor(
        () =>
          expect(result.current.query.data).toEqual({
            id: '3',
            title: 'Meanwhile, this changed server-side.',
            contents: 'TODO',
          }),
        50
      )
    ).rejects.toBeTruthy();

    act(() => void result.current.query.refetch());

    // manually refetching gives up-to-date data
    await hookWaitFor(
      () =>
        expect(result.current.query.data).toEqual({
          id: '3',
          title: 'Meanwhile, this changed server-side.',
          contents: 'TODO',
        }),
      50
    );
  });
});
