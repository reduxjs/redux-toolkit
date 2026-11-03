import type {
  InfiniteData,
  InfiniteQueryDefinition,
  QueryDefinition,
  TypedUseInfiniteQueryStateResult,
  TypedUseQueryStateResult,
  UseInfiniteQueryStateDefaultResult,
  UseQueryStateDefaultResult,
} from '@reduxjs/toolkit/query/react'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

interface Post {
  id: number
  title: string
}

const api = createApi({
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    getPost: build.query<Post, number>({
      queryFn: (id) => ({ data: { id, title: '' } }),
    }),
    getPosts: build.infiniteQuery<Post[], string, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages, lastPageParam) =>
          lastPageParam + 1,
      },
      queryFn: () => ({ data: [] }),
    }),
  }),
})

type BaseQuery = ReturnType<typeof fakeBaseQuery>
type GetPostDefinition = QueryDefinition<number, BaseQuery, never, Post>
type GetPostsDefinition = InfiniteQueryDefinition<
  string,
  number,
  BaseQuery,
  never,
  Post[]
>

describe('hook default result types', () => {
  test('UseQueryStateDefaultResult is the default useQuery result', () => {
    expectTypeOf<UseQueryStateDefaultResult<GetPostDefinition>>().toEqualTypeOf<
      TypedUseQueryStateResult<Post, number, BaseQuery>
    >()

    const result = api.endpoints.getPost.useQuery(1)

    expectTypeOf(result).toExtend<
      UseQueryStateDefaultResult<GetPostDefinition>
    >()

    const narrowed = {} as UseQueryStateDefaultResult<GetPostDefinition>
    if (narrowed.isSuccess) {
      expectTypeOf(narrowed.data).toEqualTypeOf<Post>()
    }
  })

  test('UseQueryStateDefaultResult can type a generic hook wrapper', () => {
    function useWrappedQuery<
      R extends Record<string, unknown> =
        UseQueryStateDefaultResult<GetPostDefinition>,
    >(
      arg: number,
      selectFromResult?: (
        result: UseQueryStateDefaultResult<GetPostDefinition>,
      ) => R,
    ) {
      return api.endpoints.getPost.useQuery(arg, { selectFromResult })
    }

    expectTypeOf(
      useWrappedQuery(1, (result) => ({ title: result.data?.title })),
    )
      .toHaveProperty('title')
      .toEqualTypeOf<string | undefined>()
  })

  test('UseInfiniteQueryStateDefaultResult is the default useInfiniteQuery result', () => {
    expectTypeOf<
      UseInfiniteQueryStateDefaultResult<GetPostsDefinition>
    >().toEqualTypeOf<
      TypedUseInfiniteQueryStateResult<Post[], string, number, BaseQuery>
    >()

    const narrowed =
      {} as UseInfiniteQueryStateDefaultResult<GetPostsDefinition>
    if (narrowed.isSuccess) {
      expectTypeOf(narrowed.data).toEqualTypeOf<InfiniteData<Post[], number>>()
    }
    expectTypeOf(narrowed.hasNextPage).toBeBoolean()
  })
})
