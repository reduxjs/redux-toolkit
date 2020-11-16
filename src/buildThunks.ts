import { createAsyncThunk } from '@reduxjs/toolkit';
import { InternalRootState, QuerySubstateIdentifier } from './apiState';
import { StartQueryActionCreatorOptions } from './buildActionMaps';
import { EndpointDefinitions } from './endpointDefinitions';

export interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier, StartQueryActionCreatorOptions {
  originalArgs: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
}

export interface MutationThunkArg<InternalQueryArgs> {
  originalArgs: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  track?: boolean;
}

export interface QueryApi {
  signal: AbortSignal;
  rejectWithValue(value: any): unknown;
}

function defaultTransformResponse(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue;
}

export function buildThunks<InternalQueryArgs, ReducerPath extends string>({
  reducerPath,
  baseQuery,
  endpointDefinitions,
}: {
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  reducerPath: ReducerPath;
  endpointDefinitions: EndpointDefinitions;
}) {
  const queryThunk = createAsyncThunk<
    unknown,
    QueryThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(
    `${reducerPath}/executeQuery`,
    (arg, { signal, rejectWithValue }) => {
      return baseQuery(arg.internalQueryArgs, { signal, rejectWithValue }).then(
        endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse
      );
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
    unknown,
    MutationThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(`${reducerPath}/executeMutation`, (arg, { signal, rejectWithValue }) => {
    return baseQuery(arg.internalQueryArgs, { signal, rejectWithValue }).then(
      endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse
    );
  });

  return { queryThunk, mutationThunk };
}
