import { InternalSerializeQueryArgs } from '.';
import { Api, ApiEndpointQuery, BaseQueryFn, BaseQueryArg, BaseQueryError } from './apiTypes';
import { InternalRootState, QueryKeys, QueryStatus, QuerySubstateIdentifier } from './apiState';
import { StartQueryActionCreatorOptions } from './buildActionMaps';
import {
  EndpointDefinition,
  EndpointDefinitions,
  MutationApi,
  MutationDefinition,
  QueryArgFrom,
  QueryDefinition,
  ResultTypeFrom,
} from './endpointDefinitions';
import { Draft, isAllOf, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit';
import { Patch, isDraftable, produceWithPatches, enablePatches } from 'immer';
import { AnyAction, createAsyncThunk, ThunkAction, ThunkDispatch, AsyncThunk } from '@reduxjs/toolkit';

import { PrefetchOptions } from './buildHooks';

declare module './apiTypes' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > extends Matchers<QueryThunk, Definition> {}

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > extends Matchers<MutationThunk, Definition> {}
}

type EndpointThunk<
  Thunk extends AsyncThunk<any, any, any>,
  Definition extends EndpointDefinition<any, any, any, any>
> = Definition extends EndpointDefinition<infer QueryArg, infer BaseQueryFn, any, infer ResultType>
  ? Thunk extends AsyncThunk<infer ATResult, infer ATArg, infer ATConfig>
    ? AsyncThunk<
        ATResult & { result: ResultType },
        ATArg & { originalArgs: QueryArg },
        ATConfig & { rejectValue: BaseQueryError<BaseQueryFn> }
      >
    : never
  : never;

export type PendingAction<
  Thunk extends AsyncThunk<any, any, any>,
  Definition extends EndpointDefinition<any, any, any, any>
> = ReturnType<EndpointThunk<Thunk, Definition>['pending']>;

export type FulfilledAction<
  Thunk extends AsyncThunk<any, any, any>,
  Definition extends EndpointDefinition<any, any, any, any>
> = ReturnType<EndpointThunk<Thunk, Definition>['fulfilled']>;

export type RejectedAction<
  Thunk extends AsyncThunk<any, any, any>,
  Definition extends EndpointDefinition<any, any, any, any>
> = ReturnType<EndpointThunk<Thunk, Definition>['rejected']>;

export type Matcher<M> = (value: any) => value is M;

export interface Matchers<
  Thunk extends AsyncThunk<any, any, any>,
  Definition extends EndpointDefinition<any, any, any, any>
> {
  matchPending: Matcher<PendingAction<Thunk, Definition>>;
  matchFulfilled: Matcher<FulfilledAction<Thunk, Definition>>;
  matchRejected: Matcher<RejectedAction<Thunk, Definition>>;
}

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

export type QueryThunk = AsyncThunk<ThunkResult, QueryThunkArg<any>, {}>;
export type MutationThunk = AsyncThunk<ThunkResult, MutationThunkArg<any>, {}>;

export interface QueryApi {
  signal?: AbortSignal;
  dispatch: ThunkDispatch<any, any, any>;
  getState: () => unknown;
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

export class HandledError {
  constructor(public readonly value: any) {}
}

export function buildThunks<
  BaseQuery extends BaseQueryFn,
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
        queryCacheKey: serializeQueryArgs({
          queryArgs: args,
          internalQueryArgs: endpoint.query(args),
          endpoint: endpointName,
        }),
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
    async (arg, { signal, rejectWithValue, dispatch, getState }) => {
      const result = await baseQuery(
        arg.internalQueryArgs,
        { signal, dispatch, getState },
        endpointDefinitions[arg.endpoint].extraOptions as any
      );
      if (result.error) return rejectWithValue(result.error);

      return {
        fulfilledTimeStamp: Date.now(),
        result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result.data),
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
      const result = await baseQuery(
        arg.internalQueryArgs,
        { signal, dispatch: api.dispatch, getState: api.getState },
        endpointDefinitions[arg.endpoint].extraOptions as any
      );
      if (result.error) throw new HandledError(result.error);
      if (endpoint.onSuccess) endpoint.onSuccess(arg.originalArgs, mutationApi, result.data);
      return {
        fulfilledTimeStamp: Date.now(),
        result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result.data),
      };
    } catch (error) {
      if (endpoint.onError)
        endpoint.onError(arg.originalArgs, mutationApi, error instanceof HandledError ? error.value : error);
      if (error instanceof HandledError) {
        return rejectWithValue(error.value);
      }
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

  function matchesEndpoint(endpoint: string) {
    return (action: any): action is AnyAction => action?.meta?.arg?.endpoint === endpoint;
  }

  function buildMatchThunkActions<
    Thunk extends AsyncThunk<any, QueryThunkArg<any>, any> | AsyncThunk<any, MutationThunkArg<any>, any>
  >(thunk: Thunk, endpoint: string) {
    return {
      matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpoint)),
      matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpoint)),
      matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpoint)),
    } as Matchers<Thunk, any>;
  }

  return { queryThunk, mutationThunk, prefetchThunk, updateQueryResult, patchQueryResult, buildMatchThunkActions };
}
