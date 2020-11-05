import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
  EndpointDefinition,
} from './endpointDefinitions';
import type { QueryThunkArg, MutationThunkArg } from './buildThunks';
import { AnyAction, AsyncThunk, AsyncThunkAction, ThunkAction } from '@reduxjs/toolkit';
import { QuerySubState } from './apiState';
import { QueryResultSelectors } from './buildSelectors';
import { UnsubscribeQueryResult } from './buildSlice';

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

type StartMutationActionCreator<
  D extends MutationDefinition<any, any, any, any>,
  ThunkArg
> = D extends MutationDefinition<infer QueryArg, any, any, infer ResultType>
  ? (arg: QueryArg) => AsyncThunkAction<ResultType, ThunkArg, {}>
  : never;

export type MutationActions<Definitions extends EndpointDefinitions, InternalQueryArgs> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<infer QueryArg, infer InternalQueryArg, any, any>
    ? StartMutationActionCreator<Definitions[K], MutationThunkArg<InternalQueryArgs>>
    : never;
};

export function buildActionMaps<Definitions extends EndpointDefinitions, InternalQueryArgs>({
  endpointDefinitions,
  serializeQueryArgs,
  queryThunk,
  querySelectors,
  unsubscribeQueryResult,
  mutationThunk,
}: {
  endpointDefinitions: Definitions;
  serializeQueryArgs(args: InternalQueryArgs): string;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  querySelectors: QueryResultSelectors<Definitions, any>;
  unsubscribeQueryResult: UnsubscribeQueryResult;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
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
      const statePromise = thunkResult.then(() => querySelectors[endpoint](arg)(getState()));
      return Object.assign(statePromise, {
        arg: thunkResult.arg,
        requestId: thunkResult.requestId,
        abort: thunkResult.abort,
        refetch() {
          dispatch(queryAction(arg, { subscribe: false, forceRefetch: true }));
        },
        unsubscribe() {
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

  const queryActions = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isQueryDefinition(endpoint)) {
        acc[name] = buildQueryAction(name, endpoint);
      }
      return acc;
    },
    {} as Record<string, StartQueryActionCreator<any>>
  ) as QueryActions<Definitions>;

  const mutationActions = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isMutationDefinition(endpoint)) {
        acc[name] = (arg) => {
          const internalQueryArgs = endpoint.query(arg);
          return mutationThunk({ endpoint: name, internalQueryArgs, arg });
        };
      }
      return acc;
    },
    {} as Record<string, StartMutationActionCreator<any, any>>
  ) as MutationActions<Definitions, InternalQueryArgs>;

  return { queryActions, mutationActions };
}
