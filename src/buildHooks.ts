import { AnyAction, AsyncThunkAction, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore, batch } from 'react-redux';
import { MutationSubState, QueryStatus, QuerySubState } from './apiState';
import {
  EndpointDefinitions,
  MutationDefinition,
  QueryDefinition,
  isQueryDefinition,
  isMutationDefinition,
} from './endpointDefinitions';
import { QueryResultSelectors, MutationResultSelectors, skipSelector } from './buildSelectors';
import { QueryActions, MutationActions, QueryActionCreatorResult } from './buildActionMaps';
import { UnsubscribeMutationResult, UnsubscribeQueryResult } from './buildSlice';

export interface QueryHookOptions {
  skip?: boolean;
}

export type QueryHook<D extends QueryDefinition<any, any, any, any>> = D extends QueryDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? (arg: QueryArg, options?: QueryHookOptions) => QueryHookResult<D>
  : never;

export type QueryHookResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> &
  Pick<QueryActionCreatorResult<D>, 'refetch'>;

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = D extends MutationDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? () => [
      (
        arg: QueryArg
      ) => Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>>,
      MutationSubState<D>
    ]
  : never;

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
};

export function buildHooks<Definitions extends EndpointDefinitions>({
  endpointDefinitions,
  querySelectors,
  queryActions,
  mutationSelectors,
  mutationActions,
  unsubscribeMutationResult,
}: {
  endpointDefinitions: Definitions;
  querySelectors: QueryResultSelectors<Definitions, any>;
  queryActions: QueryActions<Definitions>;
  unsubscribeQueryResult: UnsubscribeQueryResult;
  mutationSelectors: MutationResultSelectors<Definitions, any>;
  mutationActions: MutationActions<Definitions, any>;
  unsubscribeMutationResult: UnsubscribeMutationResult;
}) {
  const hooks: Hooks<Definitions> = Object.entries(endpointDefinitions).reduce<Hooks<any>>((acc, [name, endpoint]) => {
    if (isQueryDefinition(endpoint)) {
      acc[name] = { useQuery: buildQueryHook(name) };
    } else if (isMutationDefinition(endpoint)) {
      acc[name] = { useMutation: buildMutationHook(name) };
    }
    return acc;
  }, {});

  return { hooks };

  function buildQueryHook(name: string): QueryHook<any> {
    const startQuery = queryActions[name];
    const querySelector = querySelectors[name];
    return (arg, options) => {
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const skip = options?.skip === true;

      const currentPromiseRef = useRef<QueryActionCreatorResult<any>>();

      useEffect(() => {
        if (skip) {
          return;
        }
        const promise = dispatch(startQuery(arg));
        assertIsNewRTKPromise(promise);
        currentPromiseRef.current = promise;
        return () => void promise.unsubscribe();
      }, [arg, dispatch, skip]);

      const currentState = useSelector(querySelector(skip ? skipSelector : arg));
      const refetch = useCallback(() => {
        if (currentPromiseRef.current) {
          currentPromiseRef.current.refetch();
        }
      }, []);

      return useMemo(() => ({ ...currentState, refetch }), [currentState, refetch]);
    };
  }

  function buildMutationHook(name: string): MutationHook<any> {
    return () => {
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const [requestId, setRequestId] = useState<string>();
      const store = useStore();

      const promiseRef = useRef<ReturnType<AsyncThunkAction<any, any, any>>>();

      useEffect(() => {
        return () => {
          if (promiseRef.current) {
            dispatch(unsubscribeMutationResult({ endpoint: name, requestId: promiseRef.current.requestId }));
          }
        };
      }, [dispatch]);

      const triggerMutation = useCallback(
        function (args) {
          let promise: ReturnType<AsyncThunkAction<any, any, any>>;
          batch(() => {
            if (promiseRef.current) {
              dispatch(unsubscribeMutationResult({ endpoint: name, requestId: promiseRef.current.requestId }));
            }
            promise = dispatch(mutationActions[name](args));
            assertIsNewRTKPromise(promise);
            promiseRef.current = promise;
            setRequestId(promise.requestId);
          });
          return promise!.then(() => {
            const state = store.getState();
            const mutationSubState = mutationSelectors[name](promise.requestId)(state);
            return mutationSubState as Extract<
              typeof mutationSubState,
              { status: QueryStatus.fulfilled | QueryStatus.rejected }
            >;
          });
        },
        [dispatch, store]
      );

      return [triggerMutation, useSelector(mutationSelectors[name](requestId || skipSelector))];
    };
  }
}

function assertIsNewRTKPromise(action: ReturnType<ThunkAction<any, any, any, any>>) {
  if (!('requestId' in action) || !('arg' in action)) {
    throw new Error(`
    You are running a version of RTK that is too old.
    Currently you need an experimental build of RTK.
    Please install it via
    yarn add "https://pkg.csb.dev/reduxjs/redux-toolkit/commit/56994225/@reduxjs/toolkit"
    `);
  }
}
