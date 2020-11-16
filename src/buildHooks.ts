import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, batch } from 'react-redux';
import { MutationSubState, QueryStatus, QuerySubState, SubscriptionOptions } from './apiState';
import { EndpointDefinitions, MutationDefinition, QueryDefinition, QueryArgFrom } from './endpointDefinitions';
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

export type QueryHookResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> &
  Pick<QueryActionCreatorResult<D>, 'refetch'>;

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = () => [
  (
    arg: QueryArgFrom<D>
  ) => Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>>,
  MutationSubState<D>
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

      const promiseRef = useRef<QueryActionCreatorResult<any>>();
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

      const querySelector = querySelectors[name];
      const currentState = useSelector(querySelector(skip ? skipSelector : stableArg));
      const refetch = useCallback(() => void promiseRef.current?.refetch(), []);

      return useMemo(() => ({ ...currentState, refetch }), [currentState, refetch]);
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

      return [triggerMutation, useSelector(mutationSelectors[name](requestId || skipSelector))];
    };
  }
}
