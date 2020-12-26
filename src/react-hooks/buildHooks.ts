import { AnyAction, createSelector, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, batch, shallowEqual } from 'react-redux';
import {
  MutationSubState,
  QueryStatus,
  QuerySubState,
  RequestStatusFlags,
  SubscriptionOptions,
  QueryKeys,
  RootState,
} from '../core/apiState';
import {
  EndpointDefinitions,
  MutationDefinition,
  QueryDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from '../endpointDefinitions';
import { QueryResultSelectorResult, skipSelector } from '../core/buildSelectors';
import { QueryActionCreatorResult, MutationActionCreatorResult } from '../core/buildInitiate';
import { useShallowStableValue } from '../utils';
import { Api } from '../apiTypes';
import { Id, NoInfer, Override } from '../tsHelpers';
import { ApiEndpointMutation, ApiEndpointQuery, CoreModule } from '../core/module';

export interface QueryHooks<Definition extends QueryDefinition<any, any, any, any, any>> {
  useQuery: UseQuery<Definition>;
  useQuerySubscription: UseQuerySubscription<Definition>;
  useQueryState: UseQueryState<Definition>;
}

export interface MutationHooks<Definition extends MutationDefinition<any, any, any, any, any>> {
  useMutation: MutationHook<Definition>;
}

export type UseQuery<D extends QueryDefinition<any, any, any, any>> = <R = UseQueryStateDefaultResult<D>>(
  arg: QueryArgFrom<D>,
  options?: UseQuerySubscriptionOptions & UseQueryStateOptions<D, R>
) => UseQueryStateResult<D, R> & ReturnType<UseQuerySubscription<D>>;

interface UseQuerySubscriptionOptions extends SubscriptionOptions {
  skip?: boolean;
  refetchOnMountOrArgChange?: boolean | number;
}

export type UseQuerySubscription<D extends QueryDefinition<any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: UseQuerySubscriptionOptions
) => Pick<QueryActionCreatorResult<D>, 'refetch'>;

export type QueryStateSelector<R, D extends QueryDefinition<any, any, any, any>> = (
  state: QueryResultSelectorResult<D>,
  lastResult: R | undefined,
  defaultQueryStateSelector: DefaultQueryStateSelector<D>
) => R;

export type DefaultQueryStateSelector<D extends QueryDefinition<any, any, any, any>> = (
  state: QueryResultSelectorResult<D>,
  lastResult: Pick<UseQueryStateDefaultResult<D>, 'data'>
) => UseQueryStateDefaultResult<D>;

export type UseQueryState<D extends QueryDefinition<any, any, any, any>> = <R = UseQueryStateDefaultResult<D>>(
  arg: QueryArgFrom<D>,
  options?: UseQueryStateOptions<D, R>
) => UseQueryStateResult<D, R>;

export type UseQueryStateOptions<D extends QueryDefinition<any, any, any, any>, R> = {
  skip?: boolean;
  selectFromResult?: QueryStateSelector<R, D>;
};

export type UseQueryStateResult<_ extends QueryDefinition<any, any, any, any>, R> = NoInfer<R>;

type UseQueryStateBaseResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> & {
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
};

type UseQueryStateDefaultResult<D extends QueryDefinition<any, any, any, any>> = Id<
  | Override<Extract<UseQueryStateBaseResult<D>, { status: QueryStatus.uninitialized }>, { isUninitialized: true }>
  | Override<
      UseQueryStateBaseResult<D>,
      | { isLoading: true; isFetching: boolean; data: undefined }
      | ({ isSuccess: true; isFetching: boolean; error: undefined } & Required<
          Pick<UseQueryStateBaseResult<D>, 'data' | 'fulfilledTimeStamp'>
        >)
      | ({ isError: true } & Required<Pick<UseQueryStateBaseResult<D>, 'error'>>)
    >
> & {
  /**
   * @deprecated will be removed in the next version
   * please use the `isLoading`, `isFetching`, `isSuccess`, `isError`
   * and `isUninitialized` flags instead
   */
  status: QueryStatus;
};

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = () => [
  (
    arg: QueryArgFrom<D>
  ) => {
    unwrap: () => Promise<ResultTypeFrom<D>>;
  },
  MutationSubState<D> & RequestStatusFlags
];

export type PrefetchOptions =
  | { force?: boolean }
  | {
      ifOlderThan?: false | number;
    };

const defaultQueryStateSelector: DefaultQueryStateSelector<any> = (currentState, lastResult) => {
  // data is the last known good request result we have tracked - or if none has been tracked yet the last good result for the current args
  const data = (currentState.isSuccess ? currentState.data : lastResult?.data) ?? currentState.data;

  // isFetching = true any time a request is in flight
  const isFetching = currentState.isLoading;
  // isLoading = true only when loading while no data is present yet (initial load with no data in the cache)
  const isLoading = !data && isFetching;
  // isSuccess = true when data is present
  const isSuccess = currentState.isSuccess || (isFetching && !!data);

  return { ...currentState, data, isFetching, isLoading, isSuccess } as UseQueryStateDefaultResult<any>;
};

type GenericPrefetchThunk = (
  endpointName: any,
  arg: any,
  options: PrefetchOptions
) => ThunkAction<void, any, any, AnyAction>;

export function buildHooks<Definitions extends EndpointDefinitions>({
  api,
}: {
  api: Api<any, Definitions, any, string, CoreModule>;
}) {
  return { buildQueryHooks, buildMutationHook, usePrefetch };

  function usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    defaultOptions?: PrefetchOptions
  ) {
    const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
    const stableDefaultOptions = useShallowStableValue(defaultOptions);

    return useCallback(
      (arg: any, options?: PrefetchOptions) =>
        dispatch(
          (api.util.prefetchThunk as GenericPrefetchThunk)(endpointName, arg, { ...stableDefaultOptions, ...options })
        ),
      [endpointName, dispatch, stableDefaultOptions]
    );
  }

  function buildQueryHooks(name: string): QueryHooks<any> {
    const useQuerySubscription: UseQuerySubscription<any> = (
      arg: any,
      { refetchOnReconnect, refetchOnFocus, refetchOnMountOrArgChange, skip = false, pollingInterval = 0 } = {}
    ) => {
      const { initiate } = api.endpoints[name] as ApiEndpointQuery<
        QueryDefinition<any, any, any, any, any>,
        Definitions
      >;
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const stableArg = useShallowStableValue(arg);

      const promiseRef = useRef<QueryActionCreatorResult<any>>();

      useEffect(() => {
        if (skip) {
          return;
        }

        const lastPromise = promiseRef.current;
        if (lastPromise && lastPromise.arg === stableArg) {
          // arg did not change, but options did probably, update them
          lastPromise.updateSubscriptionOptions({ pollingInterval, refetchOnReconnect, refetchOnFocus });
        } else {
          if (lastPromise) lastPromise.unsubscribe();
          const promise = dispatch(
            initiate(stableArg, {
              subscriptionOptions: { pollingInterval, refetchOnReconnect, refetchOnFocus },
              forceRefetch: refetchOnMountOrArgChange,
            })
          );
          promiseRef.current = promise;
        }
      }, [
        stableArg,
        dispatch,
        skip,
        pollingInterval,
        refetchOnMountOrArgChange,
        refetchOnFocus,
        refetchOnReconnect,
        initiate,
      ]);

      useEffect(() => {
        return () => void promiseRef.current?.unsubscribe();
      }, []);

      return useMemo(
        () => ({
          refetch: () => void promiseRef.current?.refetch(),
        }),
        []
      );
    };

    const useQueryState: UseQueryState<any> = (
      arg: any,
      { skip = false, selectFromResult = defaultQueryStateSelector as QueryStateSelector<any, any> } = {}
    ) => {
      const { select } = api.endpoints[name] as ApiEndpointQuery<QueryDefinition<any, any, any, any, any>, Definitions>;
      const stableArg = useShallowStableValue(arg);

      const lastValue = useRef<any>();

      const querySelector = useMemo(
        () =>
          createSelector(
            [select(skip ? skipSelector : stableArg), (_: any, lastResult: any) => lastResult],
            (subState, lastResult) => selectFromResult(subState, lastResult, defaultQueryStateSelector)
          ),
        [select, skip, stableArg, selectFromResult]
      );

      const currentState = useSelector(
        (state: RootState<Definitions, any, any>) => querySelector(state, lastValue.current),
        shallowEqual
      );

      useEffect(() => {
        lastValue.current = currentState;
      }, [currentState]);

      return currentState;
    };

    return {
      useQueryState,
      useQuerySubscription,
      useQuery(arg, options) {
        const querySubscriptionResults = useQuerySubscription(arg, options);
        const queryStateResults = useQueryState(arg, options);
        return useMemo(() => ({ ...queryStateResults, ...querySubscriptionResults }), [
          queryStateResults,
          querySubscriptionResults,
        ]);
      },
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
