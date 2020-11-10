import { AnyAction, AsyncThunk, Middleware, MiddlewareAPI, ThunkDispatch } from '@reduxjs/toolkit';
import { batch as reactBatch } from 'react-redux';
import { QueryCacheKey, QueryStatus, QuerySubstateIdentifier, RootState, Subscribers } from './apiState';
import { QueryActions } from './buildActionMaps';
import { QueryResultSelectors } from './buildSelectors';
import { SliceActions } from './buildSlice';
import { MutationThunkArg, QueryThunkArg } from './buildThunks';
import { calculateProvidedBy, EndpointDefinitions, FullEntityDescription } from './endpointDefinitions';

const batch = typeof reactBatch !== 'undefined' ? reactBatch : (fn: Function) => fn();

type QueryStateMeta<T> = Record<string, undefined | T>;
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
    const state = api.getState()[reducerPath];

    const toInvalidate = new Set<QueryCacheKey>();
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
        toInvalidate.add(invalidate);
      }
    }

    batch(() => {
      for (const queryCacheKey of toInvalidate.values()) {
        const querySubState = state.queries[queryCacheKey];
        const subscriptionSubState = state.queries[queryCacheKey];
        if (querySubState && subscriptionSubState) {
          if (Object.keys(subscriptionSubState).length === 0) {
            api.dispatch(removeQueryResult({ queryCacheKey }));
          } else if (querySubState.status !== QueryStatus.uninitialized) {
            api.dispatch(
              queryThunk({
                endpoint: querySubState.endpoint,
                internalQueryArgs: querySubState.internalQueryArgs,
                queryCacheKey,
                subscribe: false,
                forceRefetch: true,
              })
            );
          } else {
          }
        }
      }
    });
  }

  function handleUnsubscribe({ queryCacheKey }: QuerySubstateIdentifier, api: Api) {
    const currentTimeout = currentRemovalTimeouts[queryCacheKey];
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    currentRemovalTimeouts[queryCacheKey] = setTimeout(() => {
      api.dispatch(removeQueryResult({ queryCacheKey: queryCacheKey }));
      delete currentRemovalTimeouts![queryCacheKey];
    }, keepUnusedDataFor * 1000);
  }

  function handlePolling({ queryCacheKey }: QuerySubstateIdentifier, api: Api) {
    const querySubState = api.getState()[reducerPath].queries[queryCacheKey];
    const subscriptions = api.getState()[reducerPath].subscriptions[queryCacheKey];

    if (!querySubState || querySubState.status === QueryStatus.uninitialized) {
      return;
    }

    const currentPoll = currentPolls[queryCacheKey];
    const lowestPollingInterval = findLowestPollingInterval(subscriptions);

    // should not poll at all
    if (!Number.isFinite(lowestPollingInterval)) {
      if (currentPoll) {
        clearTimeout(currentPoll.interval);
        delete currentPolls[queryCacheKey];
      }
      return;
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval;

    // should start polling or pool sooner than scheduled
    if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
      if (currentPoll) {
        clearTimeout(currentPoll.interval);
      }
      const futurePoll = (currentPolls[queryCacheKey] = {
        nextPollTimestamp,
        interval: setInterval(() => {
          futurePoll.nextPollTimestamp = Date.now() + lowestPollingInterval;
          api.dispatch(
            queryThunk({
              endpoint: querySubState.endpoint,
              internalQueryArgs: querySubState.internalQueryArgs,
              queryCacheKey,
              subscribe: false,
              forceRefetch: true,
            })
          );
        }, lowestPollingInterval),
      });
    }
  }
}

function findLowestPollingInterval(subscribers: Subscribers = {}) {
  let lowestPollingInterval = Number.POSITIVE_INFINITY;
  for (const subscription of Object.values(subscribers)) {
    if (!!subscription.pollingInterval)
      lowestPollingInterval = Math.min(subscription.pollingInterval, lowestPollingInterval);
  }
  return lowestPollingInterval;
}
