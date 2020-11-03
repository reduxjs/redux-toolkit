import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
  EndpointDefinition,
} from './endpointDefinitions';
import type { QueryThunkArg, MutationThunkArg } from './buildThunks';
import { AsyncThunk, AsyncThunkAction } from '@reduxjs/toolkit';

type StartQueryActionCreator<D extends QueryDefinition<any, any, any, any>, ThunkArg> = D extends QueryDefinition<
  infer QueryArg,
  any,
  any,
  infer ResultType
>
  ? (arg: QueryArg, options?: { subscribe?: boolean }) => AsyncThunkAction<ResultType, ThunkArg, {}>
  : never;

export type QueryActions<Definitions extends EndpointDefinitions, InternalQueryArgs> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? StartQueryActionCreator<Definitions[K], QueryThunkArg<InternalQueryArgs>>
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
  mutationThunk,
}: {
  endpointDefinitions: Definitions;
  serializeQueryArgs(args: InternalQueryArgs): string;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
}) {
  const queryActions = Object.entries(endpointDefinitions).reduce(
    (acc, [name, endpoint]: [string, EndpointDefinition<any, any, any, any>]) => {
      if (isQueryDefinition(endpoint)) {
        acc[name] = (arg, { subscribe = true } = {}) => {
          const internalQueryArgs = endpoint.query(arg);
          return queryThunk({
            subscribe,
            endpoint: name,
            internalQueryArgs,
            serializedQueryArgs: serializeQueryArgs(internalQueryArgs),
            arg,
          });
        };
      }
      return acc;
    },
    {} as Record<string, StartQueryActionCreator<any, any>>
  ) as QueryActions<Definitions, InternalQueryArgs>;

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
