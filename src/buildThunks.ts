import { Api } from './';
import { AnyAction, createAsyncThunk, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { InternalRootState, QueryKeys, QuerySubstateIdentifier } from './apiState';

import { StartQueryActionCreatorOptions } from './buildActionMaps';
import { PrefetchOptions } from './buildHooks';
import { EndpointDefinitions } from './endpointDefinitions';
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

export function buildThunks<
  BaseQuery extends (args: any, api: QueryApi) => any,
  ReducerPath extends string,
  Definitions extends EndpointDefinitions
>({
  reducerPath,
  baseQuery,
  endpointDefinitions,
  api,
}: {
  baseQuery: BaseQuery;
  reducerPath: ReducerPath;
  endpointDefinitions: Definitions;
  api: Api<BaseQuery, Definitions, ReducerPath, string>;
}) {
  type InternalQueryArgs = BaseQueryArg<BaseQuery>;

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
  >(`${reducerPath}/executeMutation`, async (arg, { signal, rejectWithValue }) => {
    const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
    return {
      fulfilledTimeStamp: Date.now(),
      result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result),
    };
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

    const queryAction = (force: boolean = true) => api.actions[endpointName](arg, { forceRefetch: force });
    const latestStateValue = api.selectors[endpointName](arg)(getState());

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

  return { queryThunk, mutationThunk, prefetchThunk };
}
