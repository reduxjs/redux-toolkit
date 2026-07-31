/**
 * RTK Query v3 prototype: "schemas as a source of inference".
 *
 * The current builder API can infer endpoint types entirely from Standard
 * Schemas with no explicit generics (see src/query/tests/createApi.test-d.ts,
 * 'schemas as a source of inference'). In v3, the schema slots live in the
 * creator BODY, exactly like 2.x:
 *
 *   { kind: build.query({ argSchema, responseSchema, request: (arg) => ... }) }
 *
 * Because the bound creator is a normal generic call, every 2.x inference
 * path is restored:
 * - `argSchema` (or an annotated `request:` callback parameter) infers Arg
 * - `responseSchema` (or the `transformResponse` return type) infers Result
 * - `rawResponseSchema` (or an annotated `transformResponse` parameter)
 *   infers Raw
 * The base-query-dependent schema slots (`errorResponseSchema`, `metaSchema`,
 * `rawErrorResponseSchema`) also live in the body and are typed against the
 * builder's base query.
 */
import { configureStore } from '@reduxjs/toolkit'
import { describe, expectTypeOf, test } from 'vitest'
import * as v from 'valibot'
import { fetchBaseQuery } from '@internal/query/fetchBaseQuery'
import { createApiBuilder } from '@internal/query/v3/index'

const postSchema = v.object({
  id: v.number(),
  title: v.string(),
})
type Post = v.InferOutput<typeof postSchema>

const postArgSchema = v.object({
  id: v.number(),
})
type PostArg = v.InferOutput<typeof postArgSchema>

const build = createApiBuilder({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
})

describe('v3 schemas as a source of inference', () => {
  test('argSchema + responseSchema infer arg and result with zero generics', () => {
    const api = build.createApi({
      endpoints: {
        getPost: {
          kind: build.query({
            argSchema: postArgSchema,
            responseSchema: postSchema,
            request: (arg) => {
              // the request callback arg is contextually typed from argSchema
              expectTypeOf(arg).toEqualTypeOf<PostArg>()
              return `/post/${arg.id}`
            },
          }),
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
    build.createApi({
      endpoints: {
        getPosts: {
          kind: build.query({
            argSchema: postArgSchema,
            rawResponseSchema: v.array(postSchema),
            responseSchema: postSchema,
            request: (arg) => `/posts/${arg.id}/first`,
            transformResponse: (raw) => {
              expectTypeOf(raw).toEqualTypeOf<Post[]>()
              return raw[0]
            },
          }),
        },
      },
    })
  })

  test('result type IS inferred from the transformResponse return type (restored 2.x path)', () => {
    // The earlier spread-phantom encoding could not infer the result type
    // from cell-body callbacks. With bodies inside the bound creator call,
    // this is normal forward inference again — parity with the 2.x builder.
    const api = build.createApi({
      endpoints: {
        getFirstPost: {
          kind: build.query({
            rawResponseSchema: v.array(postSchema),
            request: () => '/posts',
            transformResponse: (raw) => raw[0],
          }),
        },
      },
    })

    expectTypeOf(api.$types.defs.getFirstPost.result).toEqualTypeOf<Post>()
  })

  test('annotated request parameter infers the arg type (restored 2.x path)', () => {
    const api = build.createApi({
      endpoints: {
        getById: {
          kind: build.query({
            responseSchema: postSchema,
            request: (id: number) => `/post/${id}`,
          }),
        },
      },
    })

    expectTypeOf(api.$types.defs.getById.arg).toEqualTypeOf<number>()
    expectTypeOf(api.endpoints.getById.initiate)
      .parameter(0)
      .toEqualTypeOf<number>()
  })

  test('mutation creator accepts schemas the same way', () => {
    const api = build.createApi({
      endpoints: {
        updatePost: {
          kind: build.mutation({
            argSchema: postSchema,
            responseSchema: postSchema,
            request: (post) => {
              expectTypeOf(post).toEqualTypeOf<Post>()
              return { url: `/post/${post.id}`, method: 'PATCH', body: post }
            },
          }),
        },
      },
    })

    expectTypeOf(api.$types.defs.updatePost.arg).toEqualTypeOf<Post>()
    expectTypeOf(api.$types.defs.updatePost.result).toEqualTypeOf<Post>()
  })

  test('non-schema values are rejected', () => {
    // @ts-expect-error 42 is not a StandardSchemaV1
    build.query({ request: () => '/x', argSchema: 42 })
    // @ts-expect-error a plain function is not a StandardSchemaV1
    build.mutation({ request: () => '/x', responseSchema: (x: unknown) => x })
  })
})
