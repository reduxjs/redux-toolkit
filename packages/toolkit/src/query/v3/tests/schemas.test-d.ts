/**
 * RTK Query v3 prototype: "schemas as a source of inference".
 *
 * The current builder API can infer endpoint types entirely from Standard
 * Schemas with no explicit generics (see src/query/tests/createApi.test-d.ts,
 * 'schemas as a source of inference'). In v3, the creators accept the
 * inference-bearing schema slots directly:
 *
 *   { ...query({ argSchema, responseSchema }), query: (arg) => ... }
 *
 * The creator stamps `$meta` with the schema output types AND returns the
 * schemas at runtime, so the spread lands them on the endpoint definition
 * where the existing runtime validation reads them.
 *
 * Known differences from the current builder, documented below:
 * - The endpoint arg type comes only from the stamp (generics or argSchema).
 *   Annotating the `query` callback parameter does not set the arg type.
 * - The result type is not inferred from the `transformResponse` return type.
 *   Use `responseSchema` or explicit generics instead.
 * - The base-query-dependent schema slots (`errorResponseSchema`,
 *   `metaSchema`, `rawErrorResponseSchema`) stay in the endpoint literal.
 */
import { configureStore } from '@reduxjs/toolkit'
import { describe, expectTypeOf, test } from 'vitest'
import * as v from 'valibot'
import { fetchBaseQuery } from '@internal/query/fetchBaseQuery'
import { createApi, mutation, query } from '@internal/query/v3/index'

const postSchema = v.object({
  id: v.number(),
  title: v.string(),
})
type Post = v.InferOutput<typeof postSchema>

const postArgSchema = v.object({
  id: v.number(),
})
type PostArg = v.InferOutput<typeof postArgSchema>

describe('v3 schemas as a source of inference', () => {
  test('argSchema + responseSchema infer arg and result with zero generics', () => {
    const api = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
      endpoints: {
        getPost: {
          ...query({ argSchema: postArgSchema, responseSchema: postSchema }),
          query: (arg) => {
            // the query callback arg is contextually typed from argSchema
            expectTypeOf(arg).toEqualTypeOf<PostArg>()
            return `/post/${arg.id}`
          },
        },
      },
    })

    expectTypeOf(api.$types.defs.getPost.arg).toEqualTypeOf<PostArg>()
    expectTypeOf(api.$types.defs.getPost.result).toEqualTypeOf<Post>()

    expectTypeOf(api.endpoints.getPost.initiate)
      .parameter(0)
      .toEqualTypeOf<PostArg>()

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gDM) => gDM().concat(api.middleware),
    })
    const selected = api.endpoints.getPost.select({ id: 1 })(store.getState())
    expectTypeOf(selected.data).toEqualTypeOf<Post | undefined>()
  })

  test('rawResponseSchema types the transformResponse input', () => {
    createApi({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
      endpoints: {
        getPosts: {
          ...query({
            argSchema: postArgSchema,
            rawResponseSchema: v.array(postSchema),
            responseSchema: postSchema,
          }),
          query: (arg) => `/posts/${arg.id}/first`,
          transformResponse: (raw) => {
            expectTypeOf(raw).toEqualTypeOf<Post[]>()
            return raw[0]
          },
        },
      },
    })
  })

  test('result type is NOT inferred from the transformResponse return type', () => {
    // In the current builder API, `rawResponseSchema` + `transformResponse`
    // infers ResultType from the transform's return type. The v3 encoding
    // cannot do that: inference only flows out of the creator stamp, not out
    // of cell-body callbacks. Without `responseSchema` or explicit generics,
    // the result type stays `unknown`.
    const api = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
      endpoints: {
        getFirstPost: {
          ...query({ rawResponseSchema: v.array(postSchema) }),
          query: () => '/posts',
          transformResponse: (raw) => raw[0],
        },
      },
    })

    expectTypeOf(api.$types.defs.getFirstPost.result).toEqualTypeOf<unknown>()
  })

  test('mutation creator accepts schemas the same way', () => {
    const api = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
      endpoints: {
        updatePost: {
          ...mutation({ argSchema: postSchema, responseSchema: postSchema }),
          query: (post) => {
            expectTypeOf(post).toEqualTypeOf<Post>()
            return { url: `/post/${post.id}`, method: 'PATCH', body: post }
          },
        },
      },
    })

    expectTypeOf(api.$types.defs.updatePost.arg).toEqualTypeOf<Post>()
    expectTypeOf(api.$types.defs.updatePost.result).toEqualTypeOf<Post>()
  })

  test('non-schema values are rejected by the creator', () => {
    // @ts-expect-error 42 is not a StandardSchemaV1
    query({ argSchema: 42 })
    // @ts-expect-error a plain function is not a StandardSchemaV1
    mutation({ responseSchema: (x: unknown) => x })
  })

  test('schemas land on the endpoint definition for runtime validation', () => {
    const stamp = query({
      argSchema: postArgSchema,
      responseSchema: postSchema,
    })
    // the creator carries the schemas through in its return type, so the
    // spread puts them on the definition where executeEndpoint reads them
    expectTypeOf(stamp.argSchema).toEqualTypeOf<typeof postArgSchema>()
    expectTypeOf(stamp.responseSchema).toEqualTypeOf<typeof postSchema>()
  })
})
