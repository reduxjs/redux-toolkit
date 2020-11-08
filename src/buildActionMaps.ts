import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
  EndpointDefinition,
} from './endpointDefinitions';
import type { QueryThunkArg, MutationThunkArg } from './buildThunks';
import { AnyAction, AsyncThunk, ThunkAction } from '@reduxjs/toolkit';
import { MutationSubState, QueryStatus, QuerySubState } from './apiState';
import { MutationResultSelectors, QueryResultSelectors } from './buildSelectors';
import { UnsubscribeMutationResult, UnsubscribeQueryResult } from './buildSlice';

export type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any>> = D extends QueryDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? (
      arg: QueryArg,
      options?: { subscribe?: boolean; forceRefetch?: boolean }
    ) => ThunkAction<QueryActionCreatorResult<D>, any, any, AnyAction>
  : never;

export type QueryActionCreatorResult<D extends QueryDefinition<any, any, any, any>> = D extends QueryDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? Promise<QuerySubState<D>> & {
      arg: QueryArg;
      requestId: string;
      abort(): void;
      unsubscribe(): void;
      refetch(): void;
    }
  : never;

export type QueryActions<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? StartQueryActionCreator<Definitions[K]>
    : never;
};

export type StartMutationActionCreator<D extends MutationDefinition<any, any, any, any>> = D extends MutationDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? (
      arg: QueryArg,
      options?: {
        /**
         * If this mutation should be tracked in the store.
         * If you just want to manually trigger this mutation using `dispatch` and don't care about the
         * result, state & potential errors being held in store, you can set this to false.
         * (defaults to `true`)
         */
        track?: boolean;
      }
    ) => ThunkAction<MutationActionCreatorResult<D>, any, any, AnyAction>
  : never;

export type MutationActionCreatorResult<
  D extends MutationDefinition<any, any, any, any>
> = D extends MutationDefinition<infer QueryArg, any, any, any>
  ? Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>> & {
      arg: QueryArg;
      requestId: string;
      abort(): void;
      unsubscribe(): void;
    }
  : never;

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
  unsubscribeQueryResult,
  mutationThunk,
  mutationSelectors,
  unsubscribeMutationResult,
}: {
  endpointDefinitions: Definitions;
  serializeQueryArgs(args: InternalQueryArgs): string;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  querySelectors: QueryResultSelectors<Definitions, any>;
  unsubscribeQueryResult: UnsubscribeQueryResult;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
  mutationSelectors: MutationResultSelectors<Definitions, any>;
  unsubscribeMutationResult: UnsubscribeMutationResult;
}) {
  function buildQueryAction(endpoint: string, definition: QueryDefinition<any, any, any, any>) {
    const queryAction: StartQueryActionCreator<any> = (arg, { subscribe = true, forceRefetch = false } = {}) => (
      dispatch,
      getState
    ) => {
      const internalQueryArgs = definition.query(arg);
      const serializedQueryArgs = serializeQueryArgs(internalQueryArgs);
      const thunk = queryThunk({
        subscribe,
        forceRefetch,
        endpoint,
        internalQueryArgs,
        serializedQueryArgs,
        arg,
      });
      const thunkResult = dispatch(thunk);
      assertIsNewRTKPromise(thunkResult);
      const statePromise = thunkResult.then(() => querySelectors[endpoint](arg)(getState()));
      return Object.assign(statePromise, {
        arg: thunkResult.arg,
        requestId: thunkResult.requestId,
        abort: thunkResult.abort,
        refetch() {
          dispatch(queryAction(arg, { subscribe: false, forceRefetch: true }));
        },
        unsubscribe() {
          if (subscribe)
            dispatch(
              unsubscribeQueryResult({
                endpoint,
                serializedQueryArgs,
                requestId: thunkResult.requestId,
              })
            );
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
      const thunk = mutationThunk({ endpoint, internalQueryArgs, arg, track });
      const thunkResult = dispatch(thunk);
      assertIsNewRTKPromise(thunkResult);
      const statePromise = thunkResult.then(() => {
        const currentState = mutationSelectors[endpoint](thunkResult.requestId)(getState());
        return currentState as Extract<typeof currentState, { status: QueryStatus.fulfilled | QueryStatus.rejected }>;
      });
      return Object.assign(statePromise, {
        arg: thunkResult.arg,
        requestId: thunkResult.requestId,
        abort: thunkResult.abort,
        unsubscribe() {
          if (track) dispatch(unsubscribeMutationResult({ endpoint, requestId: thunkResult.requestId }));
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
