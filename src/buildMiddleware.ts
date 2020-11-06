import { AnyAction, AsyncThunk, Middleware, ThunkDispatch } from '@reduxjs/toolkit';
import { batch as reactBatch } from 'react-redux';
import { QueryState, QueryStatus, RootState } from './apiState';
import { QueryActions } from './buildActionMaps';
import { InternalState, InvalidateQueryResult, UnsubscribeQueryResult } from './buildSlice';
import { MutationThunkArg } from './buildThunks';
import { calculateProvidedBy, EndpointDefinitions } from './endpointDefinitions';

const batch = typeof reactBatch !== 'undefined' ? reactBatch : (fn: Function) => fn();

export function buildMiddleware<Definitions extends EndpointDefinitions, ReducerPath extends string>({
  reducerPath,
  endpointDefinitions,
  queryActions,
  mutationThunk,
  removeQueryResult,
  unsubscribeQueryResult,
  keepUnusedDataFor,
}: {
  reducerPath: ReducerPath;
  endpointDefinitions: EndpointDefinitions;
  queryActions: QueryActions<Definitions>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
  removeQueryResult: InvalidateQueryResult;
  unsubscribeQueryResult: UnsubscribeQueryResult;
  keepUnusedDataFor: number;
}) {
  const currentTimeouts: Record<string, undefined | Record<string, undefined | ReturnType<typeof setTimeout>>> = {};
  const middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>> = (
    api
  ) => (next) => (action) => {
    const result = next(action);

    if (mutationThunk.fulfilled.match(action)) {
      const state = api.getState()[reducerPath] as InternalState;

      const invalidateEntities = calculateProvidedBy(
        endpointDefinitions[action.meta.arg.endpoint].invalidates,
        action.payload,
        state.mutations[action.meta.arg.endpoint]?.[action.meta.requestId]?.arg
      );
      const toInvalidate: { [endpoint: string]: Set<string> } = {};
      for (const entity of invalidateEntities) {
        const provided = state.provided[entity.type];
        if (!provided) {
          continue;
        }

        let invalidateSubscriptions =
          (entity.id !== undefined
            ? // id given: invalidate all queries that provide this type & id
              provided[entity.id]
            : // no id: invalidate all queries that provide this type
              Object.values(provided).flat(1)) ?? [];

        for (const invalidate of invalidateSubscriptions) {
          (toInvalidate[invalidate.endpoint] ??= new Set()).add(invalidate.serializedQueryArgs);
        }
      }

      batch(() => {
        for (const [endpoint, collectedArgs] of Object.entries(toInvalidate)) {
          for (const serializedQueryArgs of collectedArgs) {
            const querySubState = (state.queries as QueryState<any>)[endpoint]?.[serializedQueryArgs];
            if (querySubState) {
              if (querySubState.subscribers.length === 0) {
                api.dispatch(removeQueryResult({ endpoint, serializedQueryArgs }));
              } else if (querySubState.status !== QueryStatus.uninitialized) {
                const startQuery = queryActions[endpoint];
                const arg = querySubState.arg;
                api.dispatch(startQuery(arg, { subscribe: false, forceRefetch: true }));
              } else {
              }
            }
          }
        }
      });
    }

    if (unsubscribeQueryResult.match(action)) {
      const {
        payload: { endpoint, serializedQueryArgs },
      } = action;
      const currentTimeout = currentTimeouts[endpoint]?.[serializedQueryArgs];
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      (currentTimeouts[endpoint] ??= {})[serializedQueryArgs] = setTimeout(() => {
        api.dispatch(removeQueryResult({ endpoint, serializedQueryArgs }));
        delete currentTimeouts[endpoint]![serializedQueryArgs];
      }, keepUnusedDataFor * 1000);
    }

    return result;
  };

  return { middleware };
}
