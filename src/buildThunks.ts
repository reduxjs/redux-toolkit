import { createAsyncThunk } from '@reduxjs/toolkit';
import { InternalRootState, QuerySubstateIdentifier } from './apiState';

export interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier {
  internalQueryArgs: InternalQueryArgs;
  subscribe?: boolean;
}

export interface MutationThunkArg<InternalQueryArgs> {
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
}

export function buildThunks<InternalQueryArgs, ReducerPath extends string>({
  reducerPath,
  baseQuery,
}: {
  baseQuery(args: InternalQueryArgs): any;
  reducerPath: ReducerPath;
}) {
  const queryThunk = createAsyncThunk<
    unknown,
    QueryThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(
    `${reducerPath}/executeQuery`,
    (arg) => {
      return baseQuery(arg.internalQueryArgs);
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.endpoint]?.[arg.serializedQueryArgs];
        return requestState?.status !== 'pending';
      },
      dispatchConditionRejection: true,
    }
  );

  const mutationThunk = createAsyncThunk<
    unknown,
    MutationThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(`${reducerPath}/executeMutation`, (arg) => {
    return baseQuery(arg.internalQueryArgs);
  });

  return { queryThunk, mutationThunk };
}
