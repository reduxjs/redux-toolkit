import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
  EndpointDefinition,
  QueryArgFrom,
} from './endpointDefinitions';
import type { QueryThunkArg, MutationThunkArg } from './buildThunks';
import { AnyAction, AsyncThunk, ThunkAction } from '@reduxjs/toolkit';
import { MutationSubState, QueryStatus, QuerySubState, SubscriptionOptions } from './apiState';
import { MutationResultSelectors, QueryResultSelectors } from './buildSelectors';
import { SliceActions } from './buildSlice';
import { InternalSerializeQueryArgs } from '.';

export interface StartQueryActionCreatorOptions {
  subscribe?: boolean;
  forceRefetch?: boolean;
  subscriptionOptions?: SubscriptionOptions;
}

export type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any>> = (
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

export type QueryActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? StartQueryActionCreator<Definitions[K]>
    : never;
};

export type StartMutationActionCreator<D extends MutationDefinition<any, any, any, any>> = (
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

export type MutationActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, any>
    ? StartMutationActionCreator<Definitions[K]>
    : never;
};

export function buildActionMaps<Definitions extends EndpointDefinitions, InternalQueryArgs>({
  endpointDefinitions,
  serializeQueryArgs,
  queryThunk,
  querySelectors,
  mutationThunk,
  mutationSelectors,
  sliceActions: { unsubscribeQueryResult, unsubscribeMutationResult, updateSubscriptionOptions },
}: {
  endpointDefinitions: Definitions;
  serializeQueryArgs: InternalSerializeQueryArgs<InternalQueryArgs>;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  querySelectors: QueryResultSelectors<Definitions, any>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
  mutationSelectors: MutationResultSelectors<Definitions, any>;
  sliceActions: SliceActions;
}) {
  function buildQueryAction(endpoint: string, definition: QueryDefinition<any, any, any, any>) {
    const queryAction: StartQueryActionCreator<any> = (
      arg,
      { subscribe = true, forceRefetch = false, subscriptionOptions } = {}
    ) => (dispatch, getState) => {
      const internalQueryArgs = definition.query(arg);
      const queryCacheKey = serializeQueryArgs(internalQueryArgs, endpoint);
      const thunk = queryThunk({
        subscribe,
        forceRefetch,
        subscriptionOptions,
        endpoint,
        originalArgs: arg,
        internalQueryArgs,
        queryCacheKey,
      });
      const thunkResult = dispatch(thunk);
      const { requestId, abort } = thunkResult;
      assertIsNewRTKPromise(thunkResult);
      const statePromise = thunkResult.then(() => querySelectors[endpoint](arg)(getState()));
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
      const thunk = mutationThunk({ endpoint, internalQueryArgs, originalArgs: arg, track });
      const thunkResult = dispatch(thunk);
      const { requestId, abort } = thunkResult;
      assertIsNewRTKPromise(thunkResult);
      const statePromise = thunkResult.then(() => {
        const currentState = mutationSelectors[endpoint](requestId)(getState());
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

  const queryActions = Object.entries(endpointDefinitions).reduce<Record<string, StartQueryActionCreator<any>>>(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isQueryDefinition(endpoint)) {
        acc[name] = buildQueryAction(name, endpoint);
      }
      return acc;
    },
    {}
  ) as QueryActions<Definitions>;

  const mutationActions = Object.entries(endpointDefinitions).reduce<Record<string, StartMutationActionCreator<any>>>(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isMutationDefinition(endpoint)) {
        acc[name] = buildMutationAction(name, endpoint);
      }
      return acc;
    },
    {}
  ) as MutationActions<Definitions>;

  return { queryActions, mutationActions };
}

function assertIsNewRTKPromise(action: ReturnType<ThunkAction<any, any, any, any>>) {
  if (!('requestId' in action) || !('arg' in action)) {
    throw new Error(`
    You are running a version of RTK that is too old.
    Currently you need an experimental build of RTK.
    Please install it via
    yarn add "https://pkg.csb.dev/reduxjs/redux-toolkit/commit/2c869f4d/@reduxjs/toolkit"
    `);
  }
}
