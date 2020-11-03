import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '../src';
import React from 'react';
import { Provider } from 'react-redux';

import { renderHook, act } from '@testing-library/react-hooks';

describe('examples', () => {
  interface QueryArg {
    queryString: string;
    method?: string;
    body?: string;
  }

  interface User {
    id: string;
    firstName: string;
  }

  const api = createApi({
    reducerPath: 'api',
    baseQuery({ queryString, method = 'GET', body }: QueryArg) {
      /*
          return fetch(`https://example.com/${queryString}`, {
            method,
            body,
          }).then((result) => result.json());
          */
      return new Promise((resolve) => setTimeout(resolve, 100, { result: 'Hi folks!' }));
    },
    entityTypes: ['User', 'Comment'],
    endpoints: (build) => ({
      getUser: build.query<User, string>({
        query(id) {
          return { queryString: `user/${id}` };
        },
        provides: (result) => [{ type: 'User', id: result.id }],
      }),
      updateUser: build.mutation<User, { id: string; patch: Partial<User> }>({
        query({ id, patch }) {
          return {
            queryString: `user/${id}`,
            method: 'PATCH',
            body: JSON.stringify(patch),
          };
        },
        invalidates: (result) => [{ type: 'User', id: result.id }],
      }),
    }),
  });

  test('manual invocation', async () => {
    const store = configureStore({
      reducer: {
        api: api.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
          () => (next) => (action) => {
            console.log(action);
            return next(action);
          },
          api.middleware
        ),
    });
    store.subscribe(() => {
      console.log(JSON.stringify(store.getState().api, undefined, 2));
    });

    const _s1 = store.dispatch(api.queryActions.getUser('5'));
    const _s2 = store.dispatch(api.mutationActions.updateUser({ id: '7', patch: { firstName: 'Timmy' } }));

    await new Promise((resolve) => setTimeout(resolve, 150));

    console.log(api.selectors.query.getUser('5')(store.getState()));
    console.log(api.selectors.query.getUser('6')(store.getState()));
    console.log(api.selectors.mutation.updateUser('7')(store.getState()));

    // store.dispatch(s1); // TODO
    // store.dispatch(s2);
  });

  test.only('hooks', async () => {
    const store = configureStore({
      reducer: {
        api: api.reducer,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    });

    function Wrapper({ children }: any) {
      return <Provider store={store}>{children}</Provider>;
    }

    {
      const { result, waitForNextUpdate } = renderHook(() => api.hooks.getUser.useQuery('5'), { wrapper: Wrapper });

      expect(result.current).toEqual({
        arg: '5',
        status: 'pending',
        subscribers: [expect.any(String)],
      });

      await waitForNextUpdate();
      expect(result.current).toEqual({
        arg: '5',
        data: {
          result: 'Hi folks!',
        },
        status: 'fulfilled',
        subscribers: [expect.any(String)],
      });
    }

    {
      const { result, waitForNextUpdate } = renderHook(() => api.hooks.updateUser.useMutation(), {
        wrapper: Wrapper,
      });

      expect(result.current[1]).toEqual({
        status: 'uninitialized',
      });

      act(() => void result.current[0]({ id: '5', patch: { firstName: 'Tom' } }));

      expect(result.current[1]).toEqual({
        status: 'pending',
        arg: { id: '5', patch: { firstName: 'Tom' } },
      });

      await waitForNextUpdate();

      expect(result.current[1]).toEqual({
        status: 'fulfilled',
        arg: { id: '5', patch: { firstName: 'Tom' } },
        data: { result: 'Hi folks!' },
      });
    }
  });

  /*


// hooks:

*/
});

function _wait(time = 150) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
