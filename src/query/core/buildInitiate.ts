import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from '../endpointDefinitions';
import type { QueryThunkArg, MutationThunkArg } from './buildThunks';
import { AnyAction, AsyncThunk, ThunkAction, unwrapResult } from '@reduxjs/toolkit';
import { QuerySubState, SubscriptionOptions } from './apiState';
import { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs';
import { Api } from '../apiTypes';
import { ApiEndpointQuery } from './module';
import { BaseQueryResult } from '../baseQueryTypes';

declare module './module' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Definitions extends EndpointDefinitions
  > {
    initiate: StartQueryActionCreator<Definition>;
  }

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Definitions extends EndpointDefinitions
  > {
    initiate: StartMutationActionCreator<Definition>;
  }
}

export interface StartQueryActionCreatorOptions {
  subscribe?: boolean;
  forceRefetch?: boolean | number;
  subscriptionOptions?: SubscriptionOptions;
}

type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: StartQueryActionCreatorOptions
) => ThunkAction<QueryActionCreatorResult<D>, any, any, AnyAction>;

export type QueryActionCreatorResult<D extends QueryDefinition<any, any, any, any>> = Promise<QuerySubState<D>> & {
  arg: QueryArgFrom<D>;
  requestId: string;
  subscriptionOptions: SubscriptionOptions | undefined;
  abort(): void;
  unsubscribe(): void;
  refetch(): void;
  updateSubscriptionOptions(options: SubscriptionOptions): void;
};

type StartMutationActionCreator<D extends MutationDefinition<any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: {
    /**
     * If this mutation should be tracked in the store.
     * If you just want to manually trigger this mutation using `dispatch` and don't care about the
     * result, state & potential errors being held in store, you can set this to false.
     * (defaults to `true`)
     */
    track?: boolean;
  }
) => ThunkAction<MutationActionCreatorResult<D>, any, any, AnyAction>;

export type MutationActionCreatorResult<D extends MutationDefinition<any, any, any, any>> = Promise<
  ReturnType<BaseQueryResult<D extends MutationDefinition<any, infer BaseQuery, any, any> ? BaseQuery : never>>
> & {
  arg: QueryArgFrom<D>;
  requestId: string;
  abort(): void;
  unwrap(): Promise<ResultTypeFrom<D>>;
  unsubscribe(): void;
};

export function buildInitiate<InternalQueryArgs>({
  serializeQueryArgs,
  queryThunk,
  mutationThunk,
  api,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>;
  queryThunk: AsyncThunk<any, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<any, MutationThunkArg<any>, {}>;
  api: Api<any, EndpointDefinitions, any, any>;
}) {
  const { unsubscribeQueryResult, unsubscribeMutationResult, updateSubscriptionOptions } = api.internalActions;
  return { buildInitiateQuery, buildInitiateMutation };

  function buildInitiateQuery(endpointName: string, endpointDefinition: QueryDefinition<any, any, any, any>) {
    const queryAction: StartQueryActionCreator<any> = (
      arg,
      { subscribe = true, forceRefetch, subscriptionOptions } = {}
    ) => (dispatch, getState) => {
      const queryCacheKey = serializeQueryArgs({ queryArgs: arg, endpointDefinition, endpointName });
      const thunk = queryThunk({
        subscribe,
        forceRefetch,
        subscriptionOptions,
        endpointName,
        originalArgs: arg,
        queryCacheKey,
        startedTimeStamp: Date.now(),
      });
      const thunkResult = dispatch(thunk);
      const { requestId, abort } = thunkResult;
      const statePromise = Object.assign(
        thunkResult.then(() => (api.endpoints[endpointName] as ApiEndpointQuery<any, any>).select(arg)(getState())),
        {
          arg,
          requestId,
          subscriptionOptions,
          abort,
          refetch() {
            dispatch(queryAction(arg, { subscribe: false, forceRefetch: true }));
          },
          unsubscribe() {
            if (subscribe)
              dispatch(
                unsubscribeQueryResult({
                  queryCacheKey,
                  requestId,
                })
              );
          },
          updateSubscriptionOptions(options: SubscriptionOptions) {
            statePromise.subscriptionOptions = options;
            dispatch(updateSubscriptionOptions({ endpointName, requestId, queryCacheKey, options }));
          },
        }
      );
      return statePromise;
    };
    return queryAction;
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
      });
      const thunkResult = dispatch(thunk);
      const { requestId, abort } = thunkResult;
      const returnValuePromise = thunkResult
        .then(unwrapResult)
        .then((unwrapped) => ({
          data: unwrapped.result,
        }))
        .catch((error) => ({ error }));
      return Object.assign(returnValuePromise, {
        arg: thunkResult.arg,
        requestId,
        abort,
        unwrap() {
          return thunkResult.then(unwrapResult).then((unwrapped) => unwrapped.result);
        },
        unsubscribe() {
          if (track) dispatch(unsubscribeMutationResult({ requestId }));
        },
      });
    };
  }
}
