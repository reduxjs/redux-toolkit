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
      getDefaultMiddleware().concat(() => (next) => (action) => {
        console.log(action);
        return next(action);
      }),
  });
  store.subscribe(() => {
    console.dir(store.getState(), { depth: 5 });
  });
  type RootState = ReturnType<typeof store.getState>;
  await Promise.all([store.dispatch(api.queryActions.getUser('5')), store.dispatch(api.queryActions.getUser('6'))]);

  console.log(api.selectors.query.getUser('5')(store.getState()));
  console.log(api.selectors.query.getUser('6')(store.getState()));
  console.log(api.selectors.query.getUser('7')(store.getState()));
  console.log(api.selectors.mutation.updateUser('7')(store.getState()));

  /*

// hooks:
const queryResults = api.hooks.getUser.useQuery('5');
const [runMutation, mutationResults] = api.hooks.updateUser.useMutation();
*/
});
