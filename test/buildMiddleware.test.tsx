import { createApi } from '@rtk-incubator/rtk-query/react';
import { actionsReducer, matchSequence, setupApiStore, waitMs } from './helpers';

const baseQuery = (args?: any) => ({ data: args });
const api = createApi({
  baseQuery,
  tagTypes: ['Banana', 'Bread'],
  endpoints: (build) => ({
    getBanana: build.query<unknown, number>({
      query(id) {
        return { url: `banana/${id}` };
      },
      providesTags: ['Banana'],
    }),
    getBread: build.query<unknown, number>({
      query(id) {
        return { url: `bread/${id}` };
      },
      providesTags: ['Bread'],
    }),
  }),
});
const { getBanana, getBread } = api.endpoints;

const storeRef = setupApiStore(api, {
  ...actionsReducer,
});

it('invalidates the specified tags', async () => {
  await storeRef.store.dispatch(getBanana.initiate(1));
  matchSequence(storeRef.store.getState().actions, getBanana.matchPending, getBanana.matchFulfilled);

  await storeRef.store.dispatch(api.util.invalidateTags(['Banana', 'Bread']));

  // Slight pause to let the middleware run and such
  await waitMs(20);

  const firstSequence = [
    getBanana.matchPending,
    getBanana.matchFulfilled,
    api.util.invalidateTags.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
  ];
  matchSequence(storeRef.store.getState().actions, ...firstSequence);

  await storeRef.store.dispatch(getBread.initiate(1));
  await storeRef.store.dispatch(api.util.invalidateTags([{ type: 'Bread' }]));

  await waitMs(20);

  matchSequence(
    storeRef.store.getState().actions,
    ...firstSequence,
    getBread.matchPending,
    getBread.matchFulfilled,
    api.util.invalidateTags.match,
    getBread.matchPending,
    getBread.matchFulfilled
  );
});

describe.skip('TS only tests', () => {
  it('should allow for an array of string TagTypes', () => {
    api.util.invalidateTags(['Banana', 'Bread']);
  });
  it('should allow for an array of full TagTypes descriptions', () => {
    api.util.invalidateTags([{ type: 'Banana' }, { type: 'Bread', id: 1 }]);
  });

  it('should allow for a mix of full descriptions as well as plain strings', () => {
    api.util.invalidateTags(['Banana', { type: 'Bread', id: 1 }]);
  });
  it('should error when using non-existing TagTypes', () => {
    // @ts-expect-error
    api.util.invalidateTags(['Missing Tag']);
  });
  it('should error when using non-existing TagTypes in the full format', () => {
    // @ts-expect-error
    api.util.invalidateTags([{ type: 'Missing' }]);
  });
});
