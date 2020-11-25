import { InternalSerializeQueryArgs } from '.';
import { Api, ApiEndpointQuery } from './apiTypes';
import { InternalRootState, QueryKeys, QueryStatus, QuerySubstateIdentifier } from './apiState';
import { StartQueryActionCreatorOptions } from './buildActionMaps';
import {
  EndpointDefinitions,
  MutationApi,
  MutationDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from './endpointDefinitions';
import { Draft } from '@reduxjs/toolkit';
import { Patch, isDraftable, produceWithPatches, enablePatches } from 'immer';
import { AnyAction, createAsyncThunk, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';

import { PrefetchOptions } from './buildHooks';
import { BaseQueryArg } from './tsHelpers';

export interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier, StartQueryActionCreatorOptions {
  originalArgs: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  startedTimeStamp: number;
}

export interface MutationThunkArg<InternalQueryArgs> {
  originalArgs: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  track?: boolean;
  startedTimeStamp: number;
}

export interface ThunkResult {
  fulfilledTimeStamp: number;
  result: unknown;
}

export interface QueryApi {
  signal: AbortSignal;
  rejectWithValue(value: any): unknown;
}

function defaultTransformResponse(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue;
}

type MaybeDrafted<T> = T | Draft<T>;
type Recipe<T> = (data: MaybeDrafted<T>) => void | MaybeDrafted<T>;

export type PatchQueryResultThunk<Definitions extends EndpointDefinitions, PartialState> = <
  EndpointName extends QueryKeys<Definitions>
>(
  endpointName: EndpointName,
  args: QueryArgFrom<Definitions[EndpointName]>,
  patches: Patch[]
) => ThunkAction<void, PartialState, any, AnyAction>;

export type UpdateQueryResultThunk<Definitions extends EndpointDefinitions, PartialState> = <
  EndpointName extends QueryKeys<Definitions>
>(
  endpointName: EndpointName,
  args: QueryArgFrom<Definitions[EndpointName]>,
  updateRecicpe: Recipe<ResultTypeFrom<Definitions[EndpointName]>>
) => ThunkAction<PatchCollection, PartialState, any, AnyAction>;

type PatchCollection = { patches: Patch[]; inversePatches: Patch[] };

export function buildThunks<
  BaseQuery extends (args: any, api: QueryApi) => any,
  ReducerPath extends string,
  Definitions extends EndpointDefinitions
>({
  reducerPath,
  baseQuery,
  endpointDefinitions,
  serializeQueryArgs,
  api,
}: {
  baseQuery: BaseQuery;
  reducerPath: ReducerPath;
  endpointDefinitions: Definitions;
  serializeQueryArgs: InternalSerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  api: Api<BaseQuery, Definitions, ReducerPath, string>;
}) {
  type InternalQueryArgs = BaseQueryArg<BaseQuery>;
  type State = InternalRootState<ReducerPath>;

  const patchQueryResult: PatchQueryResultThunk<EndpointDefinitions, State> = (endpointName, args, patches) => (
    dispatch
  ) => {
    const endpoint = endpointDefinitions[endpointName];
    dispatch(
      api.internalActions.queryResultPatched({
        queryCacheKey: serializeQueryArgs(endpoint.query(args), endpointName),
        patches,
      })
    );
  };

  const updateQueryResult: UpdateQueryResultThunk<EndpointDefinitions, State> = (endpointName, args, updateRecipe) => (
    dispatch,
    getState
  ) => {
    const currentState = (api.endpoints[endpointName] as ApiEndpointQuery<any, any>).select(args)(getState());
    let ret: PatchCollection = { patches: [], inversePatches: [] };
    if (currentState.status === QueryStatus.uninitialized) {
      return ret;
    }
    if ('data' in currentState) {
      if (isDraftable(currentState.data)) {
        // call "enablePatches" as late as possible
        enablePatches();
        const [, patches, inversePatches] = produceWithPatches(currentState.data, updateRecipe);
        ret.patches.push(...patches);
        ret.inversePatches.push(...inversePatches);
      } else {
        const value = updateRecipe(currentState.data);
        ret.patches.push({ op: 'replace', path: [], value });
        ret.inversePatches.push({ op: 'replace', path: [], value: currentState.data });
      }
    }

    dispatch(patchQueryResult(endpointName, args, ret.patches));

    return ret;
  };

  const queryThunk = createAsyncThunk<
    ThunkResult,
    QueryThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(
    `${reducerPath}/executeQuery`,
    async (arg, { signal, rejectWithValue }) => {
      const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
      return {
        fulfilledTimeStamp: Date.now(),
        result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result),
      };
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.queryCacheKey];
        return !(requestState?.status === 'pending' || (requestState?.status === 'fulfilled' && !arg.forceRefetch));
      },
      dispatchConditionRejection: true,
    }
  );

  const mutationThunk = createAsyncThunk<
    ThunkResult,
    MutationThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(`${reducerPath}/executeMutation`, async (arg, { signal, rejectWithValue, ...api }) => {
    const endpoint = endpointDefinitions[arg.endpoint] as MutationDefinition<any, any, any, any>;

    const context: Record<string, any> = {};
    const mutationApi = {
      ...api,
      context,
    } as MutationApi<ReducerPath, any>;

    if (endpoint.onStart) endpoint.onStart(arg.originalArgs, mutationApi);
    try {
      const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
      if (endpoint.onSuccess) endpoint.onSuccess(arg.originalArgs, mutationApi, result);
      return {
        fulfilledTimeStamp: Date.now(),
        result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result),
      };
    } catch (error) {
      if (endpoint.onError) endpoint.onError(arg.originalArgs, mutationApi, error);
      throw error;
    }
  });

  const hasTheForce = (options: any): options is { force: boolean } => 'force' in options;
  const hasMaxAge = (options: any): options is { ifOlderThan: false | number } => 'ifOlderThan' in options;

  const prefetchThunk = <EndpointName extends QueryKeys<EndpointDefinitions>>(
    endpointName: EndpointName,
    arg: any,
    options: PrefetchOptions
  ): ThunkAction<void, any, any, AnyAction> => (dispatch: ThunkDispatch<any, any, any>, getState: () => any) => {
    const force = hasTheForce(options) && options.force;
    const maxAge = hasMaxAge(options) && options.ifOlderThan;

    const queryAction = (force: boolean = true) =>
      (api.endpoints[endpointName] as ApiEndpointQuery<any, any>).initiate(arg, { forceRefetch: force });
    const latestStateValue = (api.endpoints[endpointName] as ApiEndpointQuery<any, any>).select(arg)(getState());

    if (force) {
      dispatch(queryAction());
    } else if (maxAge) {
      const lastFulfilledTs = latestStateValue?.fulfilledTimeStamp;
      if (!lastFulfilledTs) {
        dispatch(queryAction());
        return;
      }
      const shouldRetrigger = (Number(new Date()) - Number(new Date(lastFulfilledTs))) / 1000 >= maxAge;
      if (shouldRetrigger) {
        dispatch(queryAction());
      }
    } else {
      // If prefetching with no options, just let it try
      dispatch(queryAction(false));
    }
  };

  return { queryThunk, mutationThunk, prefetchThunk, updateQueryResult, patchQueryResult };
}
