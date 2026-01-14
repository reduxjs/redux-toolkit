import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type {
  // Query hook types
  TypedUseQuery,
  TypedUseQueryHookResult,
  TypedUseQueryState,
  TypedUseQueryStateResult,
  TypedUseQueryStateOptions,
  TypedUseQuerySubscription,
  TypedUseQuerySubscriptionResult,
  TypedQueryStateSelector,
  // Lazy query hook types
  TypedUseLazyQuery,
  TypedUseLazyQueryStateResult,
  TypedUseLazyQuerySubscription,
  TypedLazyQueryTrigger,
  // Infinite query hook types
  TypedUseInfiniteQuery,
  TypedUseInfiniteQueryHookResult,
  TypedUseInfiniteQueryState,
  TypedUseInfiniteQueryStateResult,
  TypedUseInfiniteQueryStateOptions,
  TypedUseInfiniteQuerySubscription,
  TypedUseInfiniteQuerySubscriptionResult,
  TypedInfiniteQueryStateSelector,
  TypedLazyInfiniteQueryTrigger,
  // Mutation hook types
  TypedUseMutation,
  TypedUseMutationResult,
  TypedMutationTrigger,
} from './buildHooks'

/**
 * A namespace containing pre-typed hook type helpers for RTK Query.
 *
 * This provides a discoverable way to access all the typed hook helpers
 * through a single import. Use autocomplete after `Typed.` to explore
 * all available namespaces and types.
 *
 * @example
 * ```ts
 * import type { Typed } from '@reduxjs/toolkit/query/react'
 *
 * // Query result type
 * type PostsResult = Typed.UseQuery.Result<Post[], void, typeof baseQuery>
 *
 * // Mutation result type
 * type CreatePostResult = Typed.UseMutation.Result<Post, CreatePostArgs, typeof baseQuery>
 *
 * // Lazy query trigger type
 * type MyTrigger = Typed.UseLazyQuery.Trigger<Post, number, typeof baseQuery>
 *
 * // selectFromResult callback type
 * type MySelector = Typed.UseQuery.Selector<Post[], void, typeof baseQuery, { count: number }>
 * ```
 *
 * @public
 */
export declare namespace Typed {
  // ============================================
  // Query Hooks
  // ============================================

  /**
   * Types related to the `useQuery` hook.
   */
  export namespace UseQuery {
    /**
     * Type of the `useQuery` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseQuery<ResultType, QueryArg, BaseQuery>

    /**
     * Type of the full result object returned by `useQuery`.
     */
    export type Result<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseQueryHookResult<ResultType, QueryArg, BaseQuery>
      : TypedUseQueryHookResult<ResultType, QueryArg, BaseQuery, SelectedResult>

    /**
     * Type of the state result portion returned by `useQuery`.
     */
    export type StateResult<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseQueryStateResult<ResultType, QueryArg, BaseQuery>
      : TypedUseQueryStateResult<
          ResultType,
          QueryArg,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the `selectFromResult` callback for `useQuery`.
     */
    export type Selector<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedQueryStateSelector<ResultType, QueryArg, BaseQuery>
      : TypedQueryStateSelector<ResultType, QueryArg, BaseQuery, SelectedResult>

    /**
     * Type of the options object for `useQuery`.
     */
    export type Options<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseQueryStateOptions<ResultType, QueryArg, BaseQuery>
      : TypedUseQueryStateOptions<
          ResultType,
          QueryArg,
          BaseQuery,
          SelectedResult
        >
  }

  /**
   * Types related to the `useQueryState` hook.
   */
  export namespace UseQueryState {
    /**
     * Type of the `useQueryState` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseQueryState<ResultType, QueryArg, BaseQuery>

    /**
     * Type of the result object returned by `useQueryState`.
     */
    export type Result<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseQueryStateResult<ResultType, QueryArg, BaseQuery>
      : TypedUseQueryStateResult<
          ResultType,
          QueryArg,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the options object for `useQueryState`.
     */
    export type Options<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseQueryStateOptions<ResultType, QueryArg, BaseQuery>
      : TypedUseQueryStateOptions<
          ResultType,
          QueryArg,
          BaseQuery,
          SelectedResult
        >
  }

  /**
   * Types related to the `useQuerySubscription` hook.
   */
  export namespace UseQuerySubscription {
    /**
     * Type of the `useQuerySubscription` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseQuerySubscription<ResultType, QueryArg, BaseQuery>

    /**
     * Type of the result object returned by `useQuerySubscription`.
     */
    export type Result<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseQuerySubscriptionResult<ResultType, QueryArg, BaseQuery>
  }

  // ============================================
  // Lazy Query Hooks
  // ============================================

  /**
   * Types related to the `useLazyQuery` hook.
   */
  export namespace UseLazyQuery {
    /**
     * Type of the `useLazyQuery` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseLazyQuery<ResultType, QueryArg, BaseQuery>

    /**
     * Type of the state result portion returned by `useLazyQuery`.
     */
    export type Result<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseLazyQueryStateResult<ResultType, QueryArg, BaseQuery>
      : TypedUseLazyQueryStateResult<
          ResultType,
          QueryArg,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the trigger function returned by `useLazyQuery`.
     */
    export type Trigger<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedLazyQueryTrigger<ResultType, QueryArg, BaseQuery>
  }

  /**
   * Types related to the `useLazyQuerySubscription` hook.
   */
  export namespace UseLazyQuerySubscription {
    /**
     * Type of the `useLazyQuerySubscription` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseLazyQuerySubscription<ResultType, QueryArg, BaseQuery>
  }

  // ============================================
  // Infinite Query Hooks
  // ============================================

  /**
   * Types related to the `useInfiniteQuery` hook.
   */
  export namespace UseInfiniteQuery {
    /**
     * Type of the `useInfiniteQuery` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
    > = TypedUseInfiniteQuery<ResultType, QueryArg, PageParam, BaseQuery>

    /**
     * Type of the full result object returned by `useInfiniteQuery`.
     */
    export type Result<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseInfiniteQueryHookResult<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery
        >
      : TypedUseInfiniteQueryHookResult<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the state result portion returned by `useInfiniteQuery`.
     */
    export type StateResult<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseInfiniteQueryStateResult<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery
        >
      : TypedUseInfiniteQueryStateResult<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the `selectFromResult` callback for `useInfiniteQuery`.
     */
    export type Selector<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedInfiniteQueryStateSelector<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery
        >
      : TypedInfiniteQueryStateSelector<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the options object for `useInfiniteQuery`.
     */
    export type Options<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseInfiniteQueryStateOptions<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery
        >
      : TypedUseInfiniteQueryStateOptions<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery,
          SelectedResult
        >

    /**
     * Type of the lazy trigger function for infinite queries.
     */
    export type Trigger<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
    > = TypedLazyInfiniteQueryTrigger<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery
    >
  }

  /**
   * Types related to the `useInfiniteQueryState` hook.
   */
  export namespace UseInfiniteQueryState {
    /**
     * Type of the `useInfiniteQueryState` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
    > = TypedUseInfiniteQueryState<ResultType, QueryArg, PageParam, BaseQuery>

    /**
     * Type of the result object returned by `useInfiniteQueryState`.
     */
    export type Result<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseInfiniteQueryStateResult<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery
        >
      : TypedUseInfiniteQueryStateResult<
          ResultType,
          QueryArg,
          PageParam,
          BaseQuery,
          SelectedResult
        >
  }

  /**
   * Types related to the `useInfiniteQuerySubscription` hook.
   */
  export namespace UseInfiniteQuerySubscription {
    /**
     * Type of the `useInfiniteQuerySubscription` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
    > = TypedUseInfiniteQuerySubscription<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery
    >

    /**
     * Type of the result object returned by `useInfiniteQuerySubscription`.
     */
    export type Result<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery extends BaseQueryFn,
    > = TypedUseInfiniteQuerySubscriptionResult<
      ResultType,
      QueryArg,
      PageParam,
      BaseQuery
    >
  }

  // ============================================
  // Mutation Hooks
  // ============================================

  /**
   * Types related to the `useMutation` hook.
   */
  export namespace UseMutation {
    /**
     * Type of the `useMutation` hook itself.
     */
    export type Hook<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedUseMutation<ResultType, QueryArg, BaseQuery>

    /**
     * Type of the state result object returned by `useMutation`.
     */
    export type Result<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
      SelectedResult extends Record<string, any> = never,
    > = [SelectedResult] extends [never]
      ? TypedUseMutationResult<ResultType, QueryArg, BaseQuery>
      : TypedUseMutationResult<ResultType, QueryArg, BaseQuery, SelectedResult>

    /**
     * Type of the trigger function returned by `useMutation`.
     */
    export type Trigger<
      ResultType,
      QueryArg,
      BaseQuery extends BaseQueryFn,
    > = TypedMutationTrigger<ResultType, QueryArg, BaseQuery>
  }
}
