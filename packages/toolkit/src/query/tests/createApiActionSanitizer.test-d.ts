import type { Action } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import {
  createApi,
  createApiActionSanitizer,
  fakeBaseQuery,
} from '@reduxjs/toolkit/query'

describe('type tests', () => {
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getPosts: build.query<string[], void>({
        queryFn: () => ({ data: [] }),
      }),
    }),
  })

  test('can be passed as the devTools actionSanitizer', () => {
    configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      devTools: { actionSanitizer: createApiActionSanitizer(api) },
    })
  })

  test('returns the same action type it was given', () => {
    const sanitize = createApiActionSanitizer(api)
    const action = { type: 'api/executeQuery/pending', payload: 1 }

    expectTypeOf(sanitize(action)).toEqualTypeOf<{
      type: string
      payload: number
    }>()
    expectTypeOf(sanitize).parameter(0).not.toBeAny()
    expectTypeOf(sanitize).parameter(0).toMatchTypeOf<Action>()
  })

  test('requires a reducerPath', () => {
    // @ts-expect-error
    createApiActionSanitizer({})
  })
})
