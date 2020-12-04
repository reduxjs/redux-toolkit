import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, batch } from 'react-redux';
import {
  MutationSubState,
  QueryStatus,
  QuerySubState,
  RequestStatusFlags,
  SubscriptionOptions,
  QueryKeys,
} from './apiState';
import {
  EndpointDefinitions,
  MutationDefinition,
  QueryDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from './endpointDefinitions';
import { skipSelector } from './buildSelectors';
import { QueryActionCreatorResult, MutationActionCreatorResult } from './buildActionMaps';
import { useShallowStableValue } from './utils';
import { Api, ApiEndpointMutation, ApiEndpointQuery } from './apiTypes';
import { Id, Override } from './tsHelpers';

interface QueryHookOptions extends SubscriptionOptions {
  skip?: boolean;
  refetchOnMountOrArgChange?: boolean | number;
}

declare module './apiTypes' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    useQuery: QueryHook<Definition>;
  }

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    useMutation: MutationHook<Definition>;
  }
}

export type QueryHook<D extends QueryDefinition<any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: QueryHookOptions
) => QueryHookResult<D>;

type BaseQueryHookResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> & {
  /**
   * Query has not started yet.
   */
  isUninitialized: false;
  /**
   * Query is currently loading for the first time. No data yet.
   */
  isLoading: false;
  /**
   * Query is currently fetching, but might have data from an earlier request.
   */
  isFetching: false;
  /**
   * Query has data from a successful load.
   */
  isSuccess: false;
  /**
   * Query is currently in "error" state.
   */
  isError: false;
} & Pick<QueryActionCreatorResult<D>, 'refetch'>;

type QueryHookResult<D extends QueryDefinition<any, any, any, any>> = Id<
  | Override<Extract<BaseQueryHookResult<D>, { status: QueryStatus.uninitialized }>, { isUninitialized: true }>
  | Override<
      BaseQueryHookResult<D>,
      | { isLoading: true; isFetching: boolean; data: undefined }
      | ({ isSuccess: true; isFetching: boolean; error: undefined } & Required<
          Pick<BaseQueryHookResult<D>, 'data' | 'fulfilledTimeStamp'>
        >)
      | ({ isError: true } & Required<Pick<BaseQueryHookResult<D>, 'error'>>)
    >
>;

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = () => [
  (
    arg: QueryArgFrom<D>
  ) => Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>>,
  MutationSubState<D> & RequestStatusFlags
];

export type PrefetchOptions =
  | { force?: boolean }
  | {
      ifOlderThan?: false | number;
    };

export function buildHooks<Definitions extends EndpointDefinitions>({
  api,
}: {
  api: Api<any, Definitions, any, string>;
}) {
  return { buildQueryHook, buildMutationHook, usePrefetch };

  function usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    defaultOptions?: PrefetchOptions
  ) {
    const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
    const stableDefaultOptions = useShallowStableValue(defaultOptions);

    return useCallback(
      (arg: any, options?: PrefetchOptions) =>
        dispatch(api.internalActions.prefetchThunk(endpointName, arg, { ...stableDefaultOptions, ...options })),
      [endpointName, dispatch, stableDefaultOptions]
    );
  }

  function buildQueryHook(name: string): QueryHook<any> {
    return (arg: any, { refetchOnMountOrArgChange = false, skip = false, pollingInterval = 0 } = {}) => {
      const { select, initiate } = api.endpoints[name] as ApiEndpointQuery<
        QueryDefinition<any, any, any, any, any>,
        Definitions
      >;
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();

      const stableArg = useShallowStableValue(arg);

      const lastData = useRef<ResultTypeFrom<Definitions[string]> | undefined>();
      const promiseRef = useRef<QueryActionCreatorResult<any>>();

      const querySelector = useMemo(() => select(skip ? skipSelector : stableArg), [select, skip, stableArg]);
      const currentState = useSelector(querySelector);

      useEffect(() => {
        if (skip) {
          return;
        }

        const lastPromise = promiseRef.current;
        if (lastPromise && lastPromise.arg === stableArg) {
          // arg did not change, but options did probably, update them
          lastPromise.updateSubscriptionOptions({ pollingInterval });
        } else {
          if (lastPromise) lastPromise.unsubscribe();
          const promise = dispatch(
            initiate(stableArg, { subscriptionOptions: { pollingInterval }, refetchOnMountOrArgChange })
          );
          promiseRef.current = promise;
        }
      }, [stableArg, dispatch, skip, pollingInterval, refetchOnMountOrArgChange, initiate]);

      useEffect(() => {
        return () => void promiseRef.current?.unsubscribe();
      }, []);

      useEffect(() => {
        if (currentState.status === QueryStatus.fulfilled) {
          lastData.current = currentState.data;
        }
      }, [currentState]);

      const refetch = useCallback(() => void promiseRef.current?.refetch(), []);

      // data is the last known good request result
      const data = currentState.status === 'fulfilled' ? currentState.data : lastData.current;

      const isPending = currentState.status === QueryStatus.pending;
      // isLoading = true only when loading while no data is present yet (initial load)
      const isLoading: any = !lastData.current && isPending;
      // isFetching = true any time a request is in flight
      const isFetching: any = isPending;
      // isSuccess = true when data is present
      const isSuccess: any = currentState.status === 'fulfilled' || (isPending && !!data);

      return useMemo(() => ({ ...currentState, data, isFetching, isLoading, isSuccess, refetch }), [
        currentState,
        data,
        isFetching,
        isLoading,
        isSuccess,
        refetch,
      ]);
    };
  }

  function buildMutationHook(name: string): MutationHook<any> {
    return () => {
      const { select, initiate } = api.endpoints[name] as ApiEndpointMutation<
        MutationDefinition<any, any, any, any, any>,
        Definitions
      >;
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const [requestId, setRequestId] = useState<string>();

      const promiseRef = useRef<MutationActionCreatorResult<any>>();

      useEffect(() => () => void promiseRef.current?.unsubscribe(), []);

      const triggerMutation = useCallback(
        function (args) {
          let promise: MutationActionCreatorResult<any>;
          batch(() => {
            if (promiseRef.current) promiseRef.current.unsubscribe();
            promise = dispatch(initiate(args));
            promiseRef.current = promise;
            setRequestId(promise.requestId);
          });
          return promise!;
        },
        [dispatch, initiate]
      );

      const mutationSelector = useMemo(() => select(requestId || skipSelector), [requestId, select]);
      const currentState = useSelector(mutationSelector);

      return useMemo(() => [triggerMutation, currentState], [triggerMutation, currentState]);
    };
  }
}
