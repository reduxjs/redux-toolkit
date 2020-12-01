import { EndpointDefinitions, QueryDefinition, MutationDefinition, QueryArgFrom } from './endpointDefinitions';
import type { QueryThunkArg, MutationThunkArg } from './buildThunks';
import { AnyAction, AsyncThunk, ThunkAction } from '@reduxjs/toolkit';
import { MutationSubState, QueryStatus, QuerySubState, SubscriptionOptions } from './apiState';
import { InternalSerializeQueryArgs } from './defaultSerializeQueryArgs';
import { Api, ApiEndpointMutation, ApiEndpointQuery } from './apiTypes';

declare module './apiTypes' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    initiate: StartQueryActionCreator<Definition>;
  }

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    initiate: StartMutationActionCreator<Definition>;
  }
}

export interface StartQueryActionCreatorOptions {
  subscribe?: boolean;
  forceRefetch?: boolean;
  subscriptionOptions?: SubscriptionOptions;
}

type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: StartQueryActionCreatorOptions
) => ThunkAction<QueryActionCreatorResult<D>, any, any, AnyAction>;

export type QueryActionCreatorResult<D extends QueryDefinition<any, any, any, any>> = Promise<QuerySubState<D>> & {
  arg: QueryArgFrom<D>;
  requestId: string;
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
  Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>
> & {
  arg: QueryArgFrom<D>;
  requestId: string;
  abort(): void;
  unsubscribe(): void;
};

export function buildActionMaps<Definitions extends EndpointDefinitions, InternalQueryArgs>({
  serializeQueryArgs,
  queryThunk,
  mutationThunk,
  api,
}: {
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>;
  queryThunk: AsyncThunk<any, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<any, MutationThunkArg<any>, {}>;
  api: Api<any, Definitions, any, string>;
}) {
  const { unsubscribeQueryResult, unsubscribeMutationResult, updateSubscriptionOptions } = api.internalActions;
  return { buildQueryAction, buildMutationAction };

  function buildQueryAction(endpoint: string, definition: QueryDefinition<any, any, any, any>) {
    const queryAction: StartQueryActionCreator<any> = (
      arg,
      { subscribe = true, forceRefetch = false, subscriptionOptions } = {}
    ) => (dispatch, getState) => {
      const internalQueryArgs = definition.query(arg);
      const queryCacheKey = serializeQueryArgs({ queryArgs: arg, internalQueryArgs, endpoint });
      const thunk = queryThunk({
        subscribe,
        forceRefetch,
        subscriptionOptions,
        endpoint,
        originalArgs: arg,
        internalQueryArgs,
        queryCacheKey,
        startedTimeStamp: Date.now(),
      });
      const thunkResult = dispatch(thunk);
      const { requestId, abort } = thunkResult;
      const statePromise = thunkResult.then(() =>
        (api.endpoints[endpoint] as ApiEndpointQuery<any, any>).select(arg)(getState())
      );
      return Object.assign(statePromise, {
        arg,
        requestId,
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
          dispatch(updateSubscriptionOptions({ endpoint, requestId, queryCacheKey, options }));
        },
      });
    };
    return queryAction;
  }

  function buildMutationAction(
    endpoint: string,
    definition: MutationDefinition<any, any, any, any>
  ): StartMutationActionCreator<any> {
    return (arg, { track = true } = {}) => (dispatch, getState) => {
      const internalQueryArgs = definition.query(arg);
      const thunk = mutationThunk({
        endpoint,
        internalQueryArgs,
        originalArgs: arg,
        track,
        startedTimeStamp: Date.now(),
      });
      const thunkResult = dispatch(thunk);
      const { requestId, abort } = thunkResult;
      const statePromise = thunkResult.then(() => {
        const currentState = (api.endpoints[endpoint] as ApiEndpointMutation<any, any>).select(requestId)(getState());
        return currentState as Extract<typeof currentState, { status: QueryStatus.fulfilled | QueryStatus.rejected }>;
      });
      return Object.assign(statePromise, {
        arg: thunkResult.arg,
        requestId,
        abort,
        unsubscribe() {
          if (track) dispatch(unsubscribeMutationResult({ requestId }));
        },
      });
    };
  }
}
