import { createApi } from '@reduxjs/toolkit/query'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'
import { delay } from 'msw'

const baseQuery = (args?: any) => ({ data: args })
const api = createApi({
  baseQuery,
  tagTypes: ['Banana', 'Bread'],
  endpoints: (build) => ({
    getBanana: build.query<unknown, number>({
      query(id) {
        return { url: `banana/${id}` }
      },
      providesTags: ['Banana'],
    }),
    getBananas: build.query<unknown, void>({
      query() {
        return { url: 'bananas' }
      },
      providesTags: ['Banana'],
    }),
    getBread: build.query<unknown, number>({
      query(id) {
        return { url: `bread/${id}` }
      },
      providesTags: ['Bread'],
    }),
  }),
})
const { getBanana, getBread } = api.endpoints

const storeRef = setupApiStore(api, {
  ...actionsReducer,
})

it('invalidates the specified tags', async () => {
  await storeRef.store.dispatch(getBanana.initiate(1))
  expect(storeRef.store.getState().actions).toMatchSequence(
    api.internalActions.middlewareRegistered.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
  )

  await storeRef.store.dispatch(api.util.invalidateTags(['Banana', 'Bread']))

  // Slight pause to let the middleware run and such
  await delay(20)

  const firstSequence = [
    api.internalActions.middlewareRegistered.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
    api.util.invalidateTags.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
  ]
  expect(storeRef.store.getState().actions).toMatchSequence(...firstSequence)

  await storeRef.store.dispatch(getBread.initiate(1))
  await storeRef.store.dispatch(api.util.invalidateTags([{ type: 'Bread' }]))

  await delay(20)

  expect(storeRef.store.getState().actions).toMatchSequence(
    ...firstSequence,
    getBread.matchPending,
    getBread.matchFulfilled,
    api.util.invalidateTags.match,
    getBread.matchPending,
    getBread.matchFulfilled,
  )
})
