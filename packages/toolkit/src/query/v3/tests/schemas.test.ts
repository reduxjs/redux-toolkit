/**
 * RTK Query v3 prototype: runtime tests for schema validation via the
 * creator's schema overload. The creator returns the schemas at runtime, so
 * spreading it into the endpoint literal lands them on the definition where
 * the existing `executeEndpoint` validation reads them.
 */
import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, test, vi } from 'vitest'
import * as v from 'valibot'
import type { BaseQueryFn } from '@internal/query/baseQueryTypes'
import { createApi, query } from '@internal/query/v3/index'

const postSchema = v.object({
  id: v.number(),
  title: v.string(),
})

const postArgSchema = v.object({
  id: v.number(),
})

function setup() {
  const baseQuery = vi.fn(async (arg: string | { url: string }) => {
    const url = typeof arg === 'string' ? arg : arg.url
    if (url === '/posts/1') {
      return { data: { id: 1, title: 'first' } }
    }
    if (url === '/posts/bad-shape') {
      return { data: { nope: true } }
    }
    return { error: { status: 404 } }
  }) satisfies BaseQueryFn

  const api = createApi({
    baseQuery,
    reducerPath: 'v3Api',
    endpoints: {
      getPost: {
        kind: query({ argSchema: postArgSchema, responseSchema: postSchema }),
        request: (arg) => `/posts/${arg.id}`,
      },
      getBadShape: {
        kind: query({ responseSchema: postSchema }),
        request: () => '/posts/bad-shape',
      },
    },
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  })

  return { api, store, baseQuery }
}

describe('v3 schema runtime validation', () => {
  test('valid arg and response pass through', async () => {
    const { api, store } = setup()

    const result = await store.dispatch(
      api.endpoints.getPost.initiate({ id: 1 }),
    )
    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ id: 1, title: 'first' })
  })

  test('invalid arg fails argSchema validation before fetching', async () => {
    const { api, store, baseQuery } = setup()

    const result = await store.dispatch(
      api.endpoints.getPost.initiate({ id: 'oops' } as unknown as {
        id: number
      }),
    )
    expect(result.error).toBeDefined()
    expect(result.error).toMatchObject({
      name: 'SchemaError',
      message: expect.stringContaining('Invalid'),
    })
    expect(baseQuery).not.toHaveBeenCalled()
  })

  test('response failing responseSchema validation surfaces as an error', async () => {
    const { api, store } = setup()

    const result = await store.dispatch(
      api.endpoints.getBadShape.initiate(undefined as void),
    )
    expect(result.error).toBeDefined()
    expect(result.error).toMatchObject({
      name: 'SchemaError',
      message: expect.stringContaining('Invalid'),
    })
  })
})
