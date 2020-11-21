import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, batch } from 'react-redux';
import { MutationSubState, QueryStatus, QuerySubState, RequestStatusFlags, SubscriptionOptions } from './apiState';
import {
  EndpointDefinitions,
  MutationDefinition,
  QueryDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from './endpointDefinitions';
import { QueryResultSelectors, MutationResultSelectors, skipSelector } from './buildSelectors';
import {
  QueryActions,
  MutationActions,
  QueryActionCreatorResult,
  MutationActionCreatorResult,
} from './buildActionMaps';
import { TS41Hooks } from './ts41Types';
import { useShallowStableValue } from './utils';

export interface QueryHookOptions extends SubscriptionOptions {
  skip?: boolean;
}

export type QueryHook<D extends QueryDefinition<any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: QueryHookOptions
) => QueryHookResult<D>;

type AdditionalQueryStatusFlags = {
  isFetching: boolean;
};
export type QueryHookResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> &
  RequestStatusFlags &
  AdditionalQueryStatusFlags &
  Pick<QueryActionCreatorResult<D>, 'refetch'>;

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = () => [
  (
    arg: QueryArgFrom<D>
  ) => Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>>,
  MutationSubState<D> & RequestStatusFlags
];

export type Hooks<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? {
        useQuery: QueryHook<Definitions[K]>;
      }
    : Definitions[K] extends MutationDefinition<any, any, any, any>
    ? {
        useMutation: MutationHook<Definitions[K]>;
      }
    : never;
} &
  TS41Hooks<Definitions>;

export function buildHooks<Definitions extends EndpointDefinitions>({
  querySelectors,
  queryActions,
  mutationSelectors,
  mutationActions,
}: {
  querySelectors: QueryResultSelectors<Definitions, any>;
  queryActions: QueryActions<Definitions>;
  mutationSelectors: MutationResultSelectors<Definitions, any>;
  mutationActions: MutationActions<Definitions>;
}) {
  return { buildQueryHook, buildMutationHook };

  function buildQueryHook(name: string): QueryHook<any> {
    return (arg: any, { skip = false, pollingInterval = 0 } = {}) => {
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();

      const stableArg = useShallowStableValue(arg);

      const lastData = useRef<ResultTypeFrom<Definitions[string]> | undefined>();
      const promiseRef = useRef<QueryActionCreatorResult<any>>();

      const buildQuerySelector = querySelectors[name];
      const querySelector = useMemo(() => buildQuerySelector(skip ? skipSelector : stableArg), [
        skip,
        stableArg,
        buildQuerySelector,
      ]);
      const currentState = useSelector(querySelector);

      useEffect(() => {
        if (skip) {
          return;
        }
        const startQuery = queryActions[name];
        const lastPromise = promiseRef.current;
        if (lastPromise && lastPromise.arg === stableArg) {
          // arg did not change, but options did probably, update them
          lastPromise.updateSubscriptionOptions({ pollingInterval });
        } else {
          if (lastPromise) lastPromise.unsubscribe();
          const promise = dispatch(startQuery(stableArg, { subscriptionOptions: { pollingInterval } }));
          promiseRef.current = promise;
        }
      }, [stableArg, dispatch, skip, pollingInterval]);

      useEffect(() => {
        return () => void promiseRef.current?.unsubscribe();
      }, []);

      useEffect(() => {
        if (currentState.status === QueryStatus.fulfilled) {
          lastData.current = currentState.data;
        }
      }, [currentState]);

      const refetch = useCallback(() => void promiseRef.current?.refetch(), []);

      // isLoading = true only on the initial request or during any subsequent retry/poll attempt until data is returned
      // isFetching = true any time a request is in flight
      const isPending = currentState.status === QueryStatus.pending;
      const isLoading = !lastData.current && isPending;
      const isFetching = isPending;

      // data is the last known good request result
      const data = currentState.status === 'fulfilled' ? currentState.data : lastData.current;

      return useMemo(() => ({ ...currentState, data, isFetching, isLoading, refetch }), [
        currentState,
        data,
        isFetching,
        isLoading,
        refetch,
      ]);
    };
  }

  function buildMutationHook(name: string): MutationHook<any> {
    return () => {
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const [requestId, setRequestId] = useState<string>();

      const promiseRef = useRef<MutationActionCreatorResult<any>>();

      useEffect(() => () => void promiseRef.current?.unsubscribe(), []);

      const triggerMutation = useCallback(
        function (args) {
          let promise: MutationActionCreatorResult<any>;
          batch(() => {
            if (promiseRef.current) promiseRef.current.unsubscribe();
            promise = dispatch(mutationActions[name](args));
            promiseRef.current = promise;
            setRequestId(promise.requestId);
          });
          return promise!;
        },
        [dispatch]
      );

      const buildMutationSelector = querySelectors[name];
      const mutationSelector = useMemo(
        () => buildMutationSelector(mutationSelectors[name](requestId || skipSelector)),
        [requestId, buildMutationSelector]
      );
      const currentState = useSelector(mutationSelector);

      return useMemo(() => [triggerMutation, currentState], [triggerMutation, currentState]);
    };
  }
}
