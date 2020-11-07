import { createAsyncThunk } from '@reduxjs/toolkit';
import { InternalRootState, QuerySubstateIdentifier } from './apiState';
import { EndpointDefinitions } from './endpointDefinitions';

export interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier {
  arg: unknown;
  internalQueryArgs: InternalQueryArgs;
  subscribe?: boolean;
  forceRefetch?: boolean;
}

export interface MutationThunkArg<InternalQueryArgs> {
  arg: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  track?: boolean;
}

export interface QueryApi {
  signal: AbortSignal;
  rejectWithValue(value: any): unknown;
}

function defaultPostProcess(baseQueryReturnValue: unknown) {
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
        endpointDefinitions[arg.endpoint].postProcess ?? defaultPostProcess
      );
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.endpoint]?.[arg.serializedQueryArgs];
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
      endpointDefinitions[arg.endpoint].postProcess ?? defaultPostProcess
    );
  });

  return { queryThunk, mutationThunk };
}
