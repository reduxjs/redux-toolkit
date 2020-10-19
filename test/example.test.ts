import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '../src';

test('example', async () => {
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
      return new Promise((resolve) => setTimeout(resolve, 500, { result: 'Hi folks!' }));
    },
    entityTypes: ['User', 'Comment'],
    endpoints: (build) => ({
      getUser: build.query<User, string>({
        query(id) {
          return { queryString: `user/${id}` };
        },
        provides: [(result) => ({ type: 'User', id: result.id })],
      }),
      updateUser: build.mutation<User, { id: string; patch: Partial<User> }>({
        query({ id, patch }) {
          return {
            queryString: `user/${id}`,
            method: 'PATCH',
            body: JSON.stringify(patch),
          };
        },
        invalidates: [(result) => ({ type: 'User', id: result.id })],
      }),
    }),
  });

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

  const s1 = store.dispatch(api.queryActions.getUser('5'));
  const s2 = store.dispatch(api.mutationActions.updateUser({ id: '7', patch: { firstName: 'Timmy' } }));

  new Promise((resolve) => setTimeout(resolve, 1200)).then(() => {
    console.log(api.selectors.query.getUser('5')(store.getState()));
    console.log(api.selectors.query.getUser('6')(store.getState()));
    console.log(api.selectors.mutation.updateUser('7')(store.getState()));
  });

  store.dispatch(s1);
  store.dispatch(s2);

  /*


// hooks:
const queryResults = api.hooks.getUser.useQuery('5');
const [runMutation, mutationResults] = api.hooks.updateUser.useMutation();
*/
});
