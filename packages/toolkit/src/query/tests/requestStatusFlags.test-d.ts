import type {
  InfiniteQueryDefinition,
  InfiniteQueryResultSelectorResult,
  MutationDefinition,
  MutationResultSelectorResult,
  QueryDefinition,
  QueryResultSelectorResult,
  QueryStatus,
  TypedUseMutationResult,
  TypedUseQueryStateResult,
} from '@reduxjs/toolkit/query/react'

describe('request status flags in generic code', () => {
  test('query selector result flags are readable for any definition', () => {
    function describeQuery<D extends QueryDefinition<any, any, any, any>>(
      result: QueryResultSelectorResult<D>,
    ) {
      expectTypeOf(result.status).toEqualTypeOf<QueryStatus>()
      expectTypeOf(result.isUninitialized).toBeBoolean()
      expectTypeOf(result.isLoading).toBeBoolean()
      expectTypeOf(result.isSuccess).toBeBoolean()
      expectTypeOf(result.isError).toBeBoolean()

      if (result.isSuccess) {
        expectTypeOf(result.status).toEqualTypeOf<QueryStatus.fulfilled>()
      }

      return result.data
    }

    type D = QueryDefinition<number, any, never, string>

    expectTypeOf(describeQuery<D>).returns.toEqualTypeOf<string | undefined>()
  })

  test('mutation selector result flags are readable for any definition', () => {
    function describeMutation<D extends MutationDefinition<any, any, any, any>>(
      result: MutationResultSelectorResult<D>,
    ) {
      expectTypeOf(result.status).toEqualTypeOf<QueryStatus>()
      expectTypeOf(result.isLoading).toBeBoolean()

      if (result.isError) {
        expectTypeOf(result.status).toEqualTypeOf<QueryStatus.rejected>()
      }

      return result.isUninitialized
    }

    type D = MutationDefinition<void, any, never, string>

    expectTypeOf(describeMutation<D>).returns.toBeBoolean()
  })

  test('infinite query selector result flags are readable for any definition', () => {
    function describeInfiniteQuery<
      D extends InfiniteQueryDefinition<any, any, any, any, any>,
    >(result: InfiniteQueryResultSelectorResult<D>) {
      expectTypeOf(result.isLoading).toBeBoolean()
      expectTypeOf(result.hasNextPage).toBeBoolean()

      return result.isFetchingNextPage
    }

    type D = InfiniteQueryDefinition<string, number, any, never, string[]>

    expectTypeOf(describeInfiniteQuery<D>).returns.toBeBoolean()
  })

  test('concrete results narrow on the status flags', () => {
    type Result = QueryResultSelectorResult<
      QueryDefinition<number, any, never, string>
    >

    const result = {} as Result

    if (result.isSuccess) {
      expectTypeOf(result.data).toBeString()
    }

    if (result.isUninitialized) {
      expectTypeOf(result.data).toBeUndefined()
    }
  })

  test('typed hook result helpers can read flags in generic code', () => {
    function useWrapped<ResultType>(
      result: TypedUseQueryStateResult<ResultType, number, any>,
    ) {
      return result.isFetching ? undefined : result.data
    }

    function useWrappedMutation<ResultType>(
      result: TypedUseMutationResult<ResultType, number, any>,
    ) {
      return result.isLoading
    }

    expectTypeOf(useWrapped<string>).returns.toEqualTypeOf<string | undefined>()
    expectTypeOf(useWrappedMutation<string>).returns.toBeBoolean()
  })
})
