import type {
  TypedUseQuery,
  TypedUseQueryHookResult,
  TypedUseQueryState,
  TypedUseQueryStateResult,
  TypedUseQueryStateOptions,
  TypedUseQuerySubscription,
  TypedUseQuerySubscriptionResult,
  TypedQueryStateSelector,
  TypedUseLazyQuery,
  TypedUseLazyQueryStateResult,
  TypedUseLazyQuerySubscription,
  TypedLazyQueryTrigger,
  TypedUseMutation,
  TypedUseMutationResult,
  TypedMutationTrigger,
  TypedUseInfiniteQuery,
  TypedUseInfiniteQueryState,
  TypedUseInfiniteQuerySubscription,
  TypedUseInfiniteQuerySubscriptionResult,
  TypedLazyInfiniteQueryTrigger,
  Typed,
} from '@reduxjs/toolkit/query/react'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const baseQuery = fetchBaseQuery()

const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    getTest: build.query<string, void>({ query: () => '' }),
    mutation: build.mutation<string, void>({ query: () => '' }),
  }),
})

describe('Typed namespace', () => {
  describe('UseQuery namespace', () => {
    test('Hook type matches TypedUseQuery', () => {
      expectTypeOf<
        Typed.UseQuery.Hook<string, void, typeof baseQuery>
      >().toEqualTypeOf<TypedUseQuery<string, void, typeof baseQuery>>()
    })

    test('Result type matches TypedUseQueryHookResult', () => {
      expectTypeOf<
        Typed.UseQuery.Result<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQueryHookResult<string, void, typeof baseQuery>
      >()
    })

    test('Result type with selectFromResult matches TypedUseQueryHookResult', () => {
      expectTypeOf<
        Typed.UseQuery.Result<string, void, typeof baseQuery, { x: boolean }>
      >().toEqualTypeOf<
        TypedUseQueryHookResult<string, void, typeof baseQuery, { x: boolean }>
      >()
    })

    test('StateResult type matches TypedUseQueryStateResult', () => {
      expectTypeOf<
        Typed.UseQuery.StateResult<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQueryStateResult<string, void, typeof baseQuery>
      >()
    })

    test('Selector type matches TypedQueryStateSelector', () => {
      expectTypeOf<
        Typed.UseQuery.Selector<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedQueryStateSelector<string, void, typeof baseQuery>
      >()
    })

    test('Selector type with custom result matches TypedQueryStateSelector', () => {
      expectTypeOf<
        Typed.UseQuery.Selector<string, void, typeof baseQuery, { x: boolean }>
      >().toEqualTypeOf<
        TypedQueryStateSelector<string, void, typeof baseQuery, { x: boolean }>
      >()
    })

    test('Options type matches TypedUseQueryStateOptions', () => {
      expectTypeOf<
        Typed.UseQuery.Options<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQueryStateOptions<string, void, typeof baseQuery>
      >()
    })
  })

  describe('UseQueryState namespace', () => {
    test('Hook type matches TypedUseQueryState', () => {
      expectTypeOf<
        Typed.UseQueryState.Hook<string, void, typeof baseQuery>
      >().toEqualTypeOf<TypedUseQueryState<string, void, typeof baseQuery>>()
    })

    test('Result type matches TypedUseQueryStateResult', () => {
      expectTypeOf<
        Typed.UseQueryState.Result<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQueryStateResult<string, void, typeof baseQuery>
      >()
    })

    test('Options type matches TypedUseQueryStateOptions', () => {
      expectTypeOf<
        Typed.UseQueryState.Options<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQueryStateOptions<string, void, typeof baseQuery>
      >()
    })
  })

  describe('UseQuerySubscription namespace', () => {
    test('Hook type matches TypedUseQuerySubscription', () => {
      expectTypeOf<
        Typed.UseQuerySubscription.Hook<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQuerySubscription<string, void, typeof baseQuery>
      >()
    })

    test('Result type matches TypedUseQuerySubscriptionResult', () => {
      expectTypeOf<
        Typed.UseQuerySubscription.Result<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseQuerySubscriptionResult<string, void, typeof baseQuery>
      >()
    })
  })

  describe('UseLazyQuery namespace', () => {
    test('Hook type matches TypedUseLazyQuery', () => {
      expectTypeOf<
        Typed.UseLazyQuery.Hook<string, void, typeof baseQuery>
      >().toEqualTypeOf<TypedUseLazyQuery<string, void, typeof baseQuery>>()
    })

    test('Result type matches TypedUseLazyQueryStateResult', () => {
      expectTypeOf<
        Typed.UseLazyQuery.Result<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseLazyQueryStateResult<string, void, typeof baseQuery>
      >()
    })

    test('Trigger type matches TypedLazyQueryTrigger', () => {
      expectTypeOf<
        Typed.UseLazyQuery.Trigger<string, void, typeof baseQuery>
      >().toEqualTypeOf<TypedLazyQueryTrigger<string, void, typeof baseQuery>>()
    })
  })

  describe('UseLazyQuerySubscription namespace', () => {
    test('Hook type matches TypedUseLazyQuerySubscription', () => {
      expectTypeOf<
        Typed.UseLazyQuerySubscription.Hook<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseLazyQuerySubscription<string, void, typeof baseQuery>
      >()
    })
  })

  describe('UseInfiniteQuery namespace', () => {
    test('Hook type matches TypedUseInfiniteQuery', () => {
      expectTypeOf<
        Typed.UseInfiniteQuery.Hook<string, void, number, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseInfiniteQuery<string, void, number, typeof baseQuery>
      >()
    })

    test('Trigger type matches TypedLazyInfiniteQueryTrigger', () => {
      expectTypeOf<
        Typed.UseInfiniteQuery.Trigger<string, void, number, typeof baseQuery>
      >().toEqualTypeOf<
        TypedLazyInfiniteQueryTrigger<string, void, number, typeof baseQuery>
      >()
    })
  })

  describe('UseInfiniteQueryState namespace', () => {
    test('Hook type matches TypedUseInfiniteQueryState', () => {
      expectTypeOf<
        Typed.UseInfiniteQueryState.Hook<string, void, number, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseInfiniteQueryState<string, void, number, typeof baseQuery>
      >()
    })
  })

  describe('UseInfiniteQuerySubscription namespace', () => {
    test('Hook type matches TypedUseInfiniteQuerySubscription', () => {
      expectTypeOf<
        Typed.UseInfiniteQuerySubscription.Hook<
          string,
          void,
          number,
          typeof baseQuery
        >
      >().toEqualTypeOf<
        TypedUseInfiniteQuerySubscription<
          string,
          void,
          number,
          typeof baseQuery
        >
      >()
    })

    test('Result type matches TypedUseInfiniteQuerySubscriptionResult', () => {
      expectTypeOf<
        Typed.UseInfiniteQuerySubscription.Result<
          string,
          void,
          number,
          typeof baseQuery
        >
      >().toEqualTypeOf<
        TypedUseInfiniteQuerySubscriptionResult<
          string,
          void,
          number,
          typeof baseQuery
        >
      >()
    })
  })

  describe('UseMutation namespace', () => {
    test('Hook type matches TypedUseMutation', () => {
      expectTypeOf<
        Typed.UseMutation.Hook<string, void, typeof baseQuery>
      >().toEqualTypeOf<TypedUseMutation<string, void, typeof baseQuery>>()
    })

    test('Result type matches TypedUseMutationResult', () => {
      expectTypeOf<
        Typed.UseMutation.Result<string, void, typeof baseQuery>
      >().toEqualTypeOf<
        TypedUseMutationResult<string, void, typeof baseQuery>
      >()
    })

    test('Result type with selectFromResult matches TypedUseMutationResult', () => {
      expectTypeOf<
        Typed.UseMutation.Result<string, void, typeof baseQuery, { x: boolean }>
      >().toEqualTypeOf<
        TypedUseMutationResult<string, void, typeof baseQuery, { x: boolean }>
      >()
    })

    test('Trigger type matches TypedMutationTrigger', () => {
      expectTypeOf<
        Typed.UseMutation.Trigger<string, void, typeof baseQuery>
      >().toEqualTypeOf<TypedMutationTrigger<string, void, typeof baseQuery>>()
    })
  })

  describe('practical usage', () => {
    test('can use Typed.UseQuery.Result to type a variable', () => {
      const result = api.endpoints.getTest.useQuery()

      expectTypeOf(result).toMatchTypeOf<
        Typed.UseQuery.Result<string, void, typeof baseQuery>
      >()
    })

    test('can use Typed.UseMutation.Result to type a variable', () => {
      const [_trigger, result] = api.endpoints.mutation.useMutation()

      expectTypeOf(result).toMatchTypeOf<
        Typed.UseMutation.Result<string, void, typeof baseQuery>
      >()
    })

    test('can use Typed.UseLazyQuery.Trigger to type a trigger function', () => {
      const [trigger] = api.endpoints.getTest.useLazyQuery()

      expectTypeOf(trigger).toMatchTypeOf<
        Typed.UseLazyQuery.Trigger<string, void, typeof baseQuery>
      >()
    })
  })
})
