import { createAsyncThunk } from '@reduxjs/toolkit';
import { InternalRootState, QuerySubstateIdentifier } from './apiState';

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
}

export interface QueryApi {
  signal: AbortSignal;
  rejectWithValue(value: any): unknown;
}

export function buildThunks<InternalQueryArgs, ReducerPath extends string>({
  reducerPath,
  baseQuery,
}: {
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  reducerPath: ReducerPath;
}) {
  const queryThunk = createAsyncThunk<
    unknown,
    QueryThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(
    `${reducerPath}/executeQuery`,
    (arg, { signal, rejectWithValue }) => {
      return baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
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
    return baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
  });

  return { queryThunk, mutationThunk };
}
