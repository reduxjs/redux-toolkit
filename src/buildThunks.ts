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
    async (arg, { signal, rejectWithValue }) => {
      const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
      return (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result);
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
  >(`${reducerPath}/executeMutation`, async (arg, { signal, rejectWithValue }) => {
    const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
    return (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result);
  });

  return { queryThunk, mutationThunk };
}
