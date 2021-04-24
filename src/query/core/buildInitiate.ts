import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from '../endpointDefinitions'
import type { QueryThunkArg, MutationThunkArg } from './buildThunks'
import {
  AnyAction,
  AsyncThunk,
  ThunkAction,
  unwrapResult,
} from '@reduxjs/toolkit'
import { QuerySubState, SubscriptionOptions } from './apiState'
import { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import { Api } from '../apiTypes'
import { ApiEndpointQuery } from './module'
import { BaseQueryResult } from '../baseQueryTypes'

declare module './module' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Definitions extends EndpointDefinitions
  > {
    initiate: StartQueryActionCreator<Definition>
  }

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Definitions extends EndpointDefinitions
  > {
    initiate: StartMutationActionCreator<Definition>
  }
}

export interface StartQueryActionCreatorOptions {
  subscribe?: boolean
  forceRefetch?: boolean | number
  subscriptionOptions?: SubscriptionOptions
}

type StartQueryActionCreator<
  D extends QueryDefinition<any, any, any, any, any>
> = (
  arg: QueryArgFrom<D>,
  options?: StartQueryActionCreatorOptions
) => ThunkAction<QueryActionCreatorResult<D>, any, any, AnyAction>

export type QueryActionCreatorResult<
  D extends QueryDefinition<any, any, any, any>
> = Promise<QuerySubState<D>> & {
  arg: QueryArgFrom<D>
  requestId: string
  subscriptionOptions: SubscriptionOptions | undefined
  abort(): void
  unsubscribe(): void
  refetch(): void
  updateSubscriptionOptions(options: SubscriptionOptions): void
}

type StartMutationActionCreator<
  D extends MutationDefinition<any, any, any, any>
> = (
  arg: QueryArgFrom<D>,
  options?: {
    /**
     * If this mutation should be tracked in the store.
     * If you just want to manually trigger this mutation using `dispatch` and don't care about the
     * result, state & potential errors being held in store, you can set this to false.
     * (defaults to `true`)
     */
    track?: boolean
  }
) => ThunkAction<MutationActionCreatorResult<D>, any, any, AnyAction>

export type MutationActionCreatorResult<
  D extends MutationDefinition<any, any, any, any>
> = Promise<
  ReturnType<
    BaseQueryResult<
      D extends MutationDefinition<any, infer BaseQuery, any, any>
        ? BaseQuery
        : never
    >
  >
> & {
  /** @internal */
  arg: {
    /**
     * The name of the given endpoint for the mutation
     */
    endpointName: string
    /**
     * The original arguments supplied to the mutation call
     */
    originalArgs: QueryArgFrom<D>
    /**
     * Whether the mutation is being tracked in the store.
     */
    track?: boolean
    /**
     * Timestamp for when the mutation was initiated
     */
    startedTimeStamp: number
  }
  /**
   * A unique string generated for the request sequence
   */
  requestId: string
  /**
   * A method to cancel the mutation promise. Note that this is not intended to prevent the mutation
   * that was fired off from reaching the server, but only to assist in handling the response.
   *
   * Calling `abort()` prior to the promise resolving will make it throw with an error like:
   * `{ name: 'AbortError', message: 'Aborted' }`
   *
   * @example
   * ```ts
   * const [updateUser] = useUpdateUserMutation();
   *
   * useEffect(() => {
   *   const promise = updateUser(id);
   *   promise
   *     .unwrap()
   *     .catch((err) => {
   *       if (err.name === 'AbortError') return;
   *       // else handle the unexpected error
   *     })
   *
   *   return () => {
   *     promise.abort();
   *   }
   * }, [id, updateUser])
   * ```
   */
  abort(): void
  /**
   * Unwraps a mutation call to provide the raw response/error.
   *
   * @remarks
   * If you need to access the error or success payload immediately after a mutation, you can chain .unwrap().
   *
   * @example
   * ```ts
   * // codeblock-meta title="Using .unwrap"
   * addPost({ id: 1, name: 'Example' })
   *   .unwrap()
   *   .then((payload) => console.log('fulfilled', payload))
   *   .catch((error) => console.error('rejected', error));
   * ```
   *
   * @example
   * ```ts
   * // codeblock-meta title="Using .unwrap with async await"
   * try {
   *   const payload = await addPost({ id: 1, name: 'Example' }).unwrap();
   *   console.log('fulfilled', payload)
   * } catch (error) {
   *   console.error('rejected', error);
   * }
   * ```
   */
  unwrap(): Promise<ResultTypeFrom<D>>
  /**
   * A method to manually unsubscribe from the mutation call, meaning it will be removed from cache after the usual caching grace period.
   The value returned by the hook will reset to `isUninitialized` afterwards.
   */
  unsubscribe(): void
}

export function buildInitiate<InternalQueryArgs>({
  serializeQueryArgs,
  queryThunk,
  mutationThunk,
  api,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>
  queryThunk: AsyncThunk<any, QueryThunkArg<any>, {}>
  mutationThunk: AsyncThunk<any, MutationThunkArg<any>, {}>
  api: Api<any, EndpointDefinitions, any, any>
}) {
  const {
    unsubscribeQueryResult,
    unsubscribeMutationResult,
    updateSubscriptionOptions,
  } = api.internalActions
  return { buildInitiateQuery, buildInitiateMutation }

  function buildInitiateQuery(
    endpointName: string,
    endpointDefinition: QueryDefinition<any, any, any, any>
  ) {
    const queryAction: StartQueryActionCreator<any> = (
      arg,
      { subscribe = true, forceRefetch, subscriptionOptions } = {}
    ) => (dispatch, getState) => {
      const queryCacheKey = serializeQueryArgs({
        queryArgs: arg,
        endpointDefinition,
        endpointName,
      })
      const thunk = queryThunk({
        subscribe,
        forceRefetch,
        subscriptionOptions,
        endpointName,
        originalArgs: arg,
        queryCacheKey,
        startedTimeStamp: Date.now(),
      })
      const thunkResult = dispatch(thunk)
      const { requestId, abort } = thunkResult
      const statePromise = Object.assign(
        thunkResult.then(() =>
          (api.endpoints[endpointName] as ApiEndpointQuery<any, any>).select(
            arg
          )(getState())
        ),
        {
          arg,
          requestId,
          subscriptionOptions,
          abort,
          refetch() {
            dispatch(queryAction(arg, { subscribe: false, forceRefetch: true }))
          },
          unsubscribe() {
            if (subscribe)
              dispatch(
                unsubscribeQueryResult({
                  queryCacheKey,
                  requestId,
                })
              )
          },
          updateSubscriptionOptions(options: SubscriptionOptions) {
            statePromise.subscriptionOptions = options
            dispatch(
              updateSubscriptionOptions({
                endpointName,
                requestId,
                queryCacheKey,
                options,
              })
            )
          },
        }
      )
      return statePromise
    }
    return queryAction
  }

  function buildInitiateMutation(
    endpointName: string,
    definition: MutationDefinition<any, any, any, any>
  ): StartMutationActionCreator<any> {
    return (arg, { track = true } = {}) => (dispatch, getState) => {
      const thunk = mutationThunk({
        endpointName,
        originalArgs: arg,
        track,
        startedTimeStamp: Date.now(),
      })
      const thunkResult = dispatch(thunk)
      const { requestId, abort } = thunkResult
      const returnValuePromise = thunkResult
        .then(unwrapResult)
        .then((unwrapped) => ({
          data: unwrapped.result,
        }))
        .catch((error) => ({ error }))
      return Object.assign(returnValuePromise, {
        arg: thunkResult.arg,
        requestId,
        abort,
        unwrap() {
          return thunkResult
            .then(unwrapResult)
            .then((unwrapped) => unwrapped.result)
        },
        unsubscribe() {
          if (track) dispatch(unsubscribeMutationResult({ requestId }))
        },
      })
    }
  }
}
