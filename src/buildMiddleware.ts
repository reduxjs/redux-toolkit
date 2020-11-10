import { AnyAction, AsyncThunk, Middleware, MiddlewareAPI, ThunkDispatch } from '@reduxjs/toolkit';
import { batch as reactBatch } from 'react-redux';
import { QueryState, QueryStatus, QuerySubState, QuerySubstateIdentifier, RootState } from './apiState';
import { QueryActions } from './buildActionMaps';
import { QueryResultSelectors } from './buildSelectors';
import { InternalState, SliceActions } from './buildSlice';
import { MutationThunkArg, QueryThunkArg } from './buildThunks';
import { calculateProvidedBy, EndpointDefinitions, FullEntityDescription } from './endpointDefinitions';

const batch = typeof reactBatch !== 'undefined' ? reactBatch : (fn: Function) => fn();

type QueryStateMeta<T> = Record<string, undefined | Record<string, undefined | T>>;
type TimeoutId = ReturnType<typeof setTimeout>;

export function buildMiddleware<Definitions extends EndpointDefinitions, ReducerPath extends string>({
  reducerPath,
  endpointDefinitions,
  queryActions,
  querySelectors,
  queryThunk,
  mutationThunk,
  keepUnusedDataFor,
  sliceActions: { removeQueryResult, unsubscribeQueryResult, updateSubscriptionOptions },
}: {
  reducerPath: ReducerPath;
  endpointDefinitions: EndpointDefinitions;
  queryActions: QueryActions<Definitions>;
  querySelectors: QueryResultSelectors<Definitions, any>;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
  sliceActions: SliceActions;
  keepUnusedDataFor: number;
}) {
  type Api = MiddlewareAPI<ThunkDispatch<any, any, AnyAction>, RootState<Definitions, string, ReducerPath>>;

  const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {};

  const currentPolls: QueryStateMeta<{ nextPollTimestamp: number; interval: TimeoutId }> = {};
  const middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>> = (
    api
  ) => (next) => (action) => {
    const result = next(action);

    if (mutationThunk.fulfilled.match(action)) {
      invalidateEntities(
        calculateProvidedBy(
          endpointDefinitions[action.meta.arg.endpoint].invalidates,
          action.payload,
          action.meta.arg.arg
        ),
        api
      );
    }

    if (unsubscribeQueryResult.match(action)) {
      handleUnsubscribe(action.payload, api);
    }

    if (updateSubscriptionOptions.match(action)) {
      handlePolling(action.payload, api);
    }
    if (queryThunk.pending.match(action) || (queryThunk.rejected.match(action) && action.meta.condition)) {
      handlePolling(action.meta.arg, api);
    }

    return result;
  };

  return { middleware };

  function invalidateEntities(entities: readonly FullEntityDescription<string>[], api: Api) {
    const rootState = api.getState();
    const state = rootState[reducerPath] as InternalState;

    const toInvalidate: { [endpoint: string]: Set<string> } = {};
    for (const entity of entities) {
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
          // const querySubState = querySelectors[endpoint](serializedQueryArgs)(rootState);
          if (querySubState) {
            if (Object.keys(querySubState.subscribers).length === 0) {
              api.dispatch(removeQueryResult({ endpoint, serializedQueryArgs }));
            } else if (querySubState.status !== QueryStatus.uninitialized) {
              const startQuery = queryActions[endpoint];
              const arg = querySubState.arg;
              api.dispatch(startQuery(arg as any, { subscribe: false, forceRefetch: true }));
            } else {
            }
          }
        }
      }
    });
  }

  function handleUnsubscribe({ endpoint, serializedQueryArgs }: QuerySubstateIdentifier, api: Api) {
    const currentTimeout = currentRemovalTimeouts[endpoint]?.[serializedQueryArgs];
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    (currentRemovalTimeouts[endpoint] ??= {})[serializedQueryArgs] = setTimeout(() => {
      api.dispatch(removeQueryResult({ endpoint, serializedQueryArgs }));
      delete currentRemovalTimeouts[endpoint]![serializedQueryArgs];
    }, keepUnusedDataFor * 1000);
  }

  function handlePolling({ endpoint, serializedQueryArgs }: QuerySubstateIdentifier, api: Api) {
    const querySubState = querySelectors[endpoint](serializedQueryArgs)(api.getState());
    // TODO: this selector is most likely returning the wrong thing due to double serialization
    const currentPoll = currentPolls[endpoint]?.[serializedQueryArgs];
    const lowestPollingInterval = findLowestPollingInterval(querySubState);

    // should not poll at all
    if (!Number.isFinite(lowestPollingInterval)) {
      if (currentPoll) {
        clearTimeout(currentPoll.interval);
        delete currentPolls[endpoint]![serializedQueryArgs];
      }
      return;
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval;

    // should start polling or pool sooner than scheduled
    if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
      if (currentPoll) {
        clearTimeout(currentPoll.interval);
      }
      const futurePoll = ((currentPolls[endpoint] ??= {})[serializedQueryArgs] = {
        nextPollTimestamp,
        interval: setInterval(() => {
          futurePoll.nextPollTimestamp = Date.now() + lowestPollingInterval;
          const startQuery = queryActions[endpoint];
          api.dispatch(startQuery(querySubState.arg as any, { subscribe: false, forceRefetch: true }));
        }, lowestPollingInterval),
      });
    }
  }
}

function findLowestPollingInterval(querySubState: QuerySubState<any>) {
  let lowestPollingInterval = Number.POSITIVE_INFINITY;
  for (const subscription of Object.values(querySubState.subscribers)) {
    if (!!subscription.pollingInterval)
      lowestPollingInterval = Math.min(subscription.pollingInterval, lowestPollingInterval);
  }
  return lowestPollingInterval;
}
