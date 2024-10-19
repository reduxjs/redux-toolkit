import { createApi } from '@reduxjs/toolkit/query'
import { delay } from 'msw'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'

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
    invalidateFruit: build.mutation({
      query: (fruit?: 'Banana' | 'Bread' | null) => ({ url: `invalidate/fruit/${fruit || ''}` }),
      invalidatesTags(result, error, arg) {
        return [arg]
      }
    })
  }),
})
const { getBanana, getBread, invalidateFruit } = api.endpoints

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

it('invalidates tags correctly when null or undefined are provided as tags', async() =>{
  await storeRef.store.dispatch(getBanana.initiate(1))
  await storeRef.store.dispatch(api.util.invalidateTags([undefined, null, 'Banana']))

  // Slight pause to let the middleware run and such
  await delay(20)

  const apiActions = [
    api.internalActions.middlewareRegistered.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
    api.util.invalidateTags.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
  ]

  expect(storeRef.store.getState().actions).toMatchSequence(...apiActions)
})


it.each([
  { tags: [undefined, null, 'Bread'] as Parameters<typeof api.util.invalidateTags>['0'] },
  { tags: [undefined, null], }, { tags: [] }]
)('does not invalidate with tags=$tags if no query matches', async ({ tags }) => {
  await storeRef.store.dispatch(getBanana.initiate(1))
  await storeRef.store.dispatch(api.util.invalidateTags(tags))

  // Slight pause to let the middleware run and such
  await delay(20)

  const apiActions = [
    api.internalActions.middlewareRegistered.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
    api.util.invalidateTags.match,
  ]

  expect(storeRef.store.getState().actions).toMatchSequence(...apiActions)
})
 
it.each([{ mutationArg: 'Bread' as "Bread" | null | undefined  }, { mutationArg: undefined }, { mutationArg: null }])('does not invalidate queries when a mutation with tags=[$mutationArg] runs and does not match anything', async ({ mutationArg }) => {
  await storeRef.store.dispatch(getBanana.initiate(1))
  await storeRef.store.dispatch(invalidateFruit.initiate(mutationArg))

  // Slight pause to let the middleware run and such
  await delay(20)

  const apiActions = [
    api.internalActions.middlewareRegistered.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
    invalidateFruit.matchPending,
    invalidateFruit.matchFulfilled,
  ]

  expect(storeRef.store.getState().actions).toMatchSequence(...apiActions)
})