import type { Middleware, UnknownAction } from '@reduxjs/toolkit'
import { configureStore, isAction } from '@reduxjs/toolkit'
import {
  createApi,
  createApiActionSanitizer,
  fakeBaseQuery,
} from '@reduxjs/toolkit/query'

describe('createApiActionSanitizer', () => {
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getPosts: build.query<string[], void>({
        queryFn: () => ({ data: ['post'] }),
      }),
      addPost: build.mutation<string, string>({
        queryFn: (title) => ({ data: title }),
      }),
    }),
  })

  const sanitize = createApiActionSanitizer(api)

  test('appends the endpoint name to query and mutation thunk actions', async () => {
    const actions: UnknownAction[] = []
    const recordSanitized: Middleware = () => (next) => (action) => {
      if (isAction(action)) actions.push(sanitize(action as UnknownAction))
      return next(action)
    }
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware).concat(recordSanitized),
    })

    await store.dispatch(api.endpoints.getPosts.initiate())
    await store.dispatch(api.endpoints.addPost.initiate('title'))

    const types = actions.map((action) => action.type)
    expect(types).toContain('api/executeQuery/pending (getPosts)')
    expect(types).toContain('api/executeQuery/fulfilled (getPosts)')
    expect(types).toContain('api/executeMutation/pending (addPost)')
    expect(types).toContain('api/executeMutation/fulfilled (addPost)')
  })

  test('does not modify the original action', () => {
    const action = {
      type: 'api/executeQuery/pending',
      meta: { arg: { endpointName: 'getPosts' } },
    }
    const sanitized = sanitize(action)
    expect(sanitized).not.toBe(action)
    expect(sanitized).toEqual({ ...action, type: `${action.type} (getPosts)` })
    expect(action.type).toBe('api/executeQuery/pending')
  })

  test('returns other actions unchanged', () => {
    const unrelated = { type: 'counter/increment' }
    const otherApi = {
      type: 'otherApi/executeQuery/pending',
      meta: { arg: { endpointName: 'getPosts' } },
    }
    const noEndpointName = { type: 'api/subscriptions/internal', meta: {} }

    expect(sanitize(unrelated)).toBe(unrelated)
    expect(sanitize(otherApi)).toBe(otherApi)
    expect(sanitize(noEndpointName)).toBe(noEndpointName)
  })

  test('uses the reducerPath of the api', () => {
    const sanitizeCustom = createApiActionSanitizer({ reducerPath: 'posts' })
    const action = {
      type: 'posts/executeQuery/fulfilled',
      meta: { arg: { endpointName: 'getPosts' } },
    }
    expect(sanitizeCustom(action).type).toBe(
      'posts/executeQuery/fulfilled (getPosts)',
    )
  })
})
