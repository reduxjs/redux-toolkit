import { AnyAction, AsyncThunk, Middleware, MiddlewareAPI, ThunkDispatch } from '@reduxjs/toolkit';
import { batch as reactBatch } from 'react-redux';
import { QueryCacheKey, QueryStatus, QuerySubstateIdentifier, RootState, Subscribers } from './apiState';
import { SliceActions } from './buildSlice';
import { MutationThunkArg, QueryThunkArg } from './buildThunks';
import { calculateProvidedBy, EndpointDefinitions, FullEntityDescription } from './endpointDefinitions';

const batch = typeof reactBatch !== 'undefined' ? reactBatch : (fn: Function) => fn();

type QueryStateMeta<T> = Record<string, undefined | T>;
type TimeoutId = ReturnType<typeof setTimeout>;

export function buildMiddleware<Definitions extends EndpointDefinitions, ReducerPath extends string>({
  reducerPath,
  endpointDefinitions,
  queryThunk,
  mutationThunk,
  keepUnusedDataFor,
  sliceActions: { removeQueryResult, unsubscribeQueryResult, updateSubscriptionOptions },
}: {
  reducerPath: ReducerPath;
  endpointDefinitions: EndpointDefinitions;
  queryThunk: AsyncThunk<unknown, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<unknown, MutationThunkArg<any>, {}>;
  sliceActions: SliceActions;
  keepUnusedDataFor: number;
}) {
  type Api = MiddlewareAPI<ThunkDispatch<any, any, AnyAction>, RootState<Definitions, string, ReducerPath>>;

  const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {};

  const currentPolls: QueryStateMeta<{ nextPollTimestamp: number; timeout?: TimeoutId; pollingInterval: number }> = {};
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
      updatePollingInterval(action.payload, api);
    }
    if (queryThunk.pending.match(action) || (queryThunk.rejected.match(action) && action.meta.condition)) {
      updatePollingInterval(action.meta.arg, api);
    }
    if (queryThunk.fulfilled.match(action) || (queryThunk.rejected.match(action) && !action.meta.condition)) {
      startNextPoll(action.meta.arg, api);
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
        const subscriptionSubState = state.subscriptions[queryCacheKey];
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

  function startNextPoll({ queryCacheKey }: QuerySubstateIdentifier, api: Api) {
    const querySubState = api.getState()[reducerPath].queries[queryCacheKey];
    const subscriptions = api.getState()[reducerPath].subscriptions[queryCacheKey];

    if (!querySubState || querySubState.status === QueryStatus.uninitialized) return;

    const lowestPollingInterval = findLowestPollingInterval(subscriptions);
    if (!Number.isFinite(lowestPollingInterval)) return;

    const currentPoll = currentPolls[queryCacheKey];

    if (currentPoll?.timeout) {
      clearTimeout(currentPoll.timeout);
      currentPoll.timeout = undefined;
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval;

    const currentInterval: typeof currentPolls[number] = (currentPolls[queryCacheKey] = {
      nextPollTimestamp,
      pollingInterval: lowestPollingInterval,
      timeout: setTimeout(() => {
        currentInterval!.timeout = undefined;
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

  function updatePollingInterval({ queryCacheKey }: QuerySubstateIdentifier, api: Api) {
    const querySubState = api.getState()[reducerPath].queries[queryCacheKey];
    const subscriptions = api.getState()[reducerPath].subscriptions[queryCacheKey];

    if (!querySubState || querySubState.status === QueryStatus.uninitialized) {
      return;
    }

    const lowestPollingInterval = findLowestPollingInterval(subscriptions);
    const currentPoll = currentPolls[queryCacheKey];

    if (!Number.isFinite(lowestPollingInterval)) {
      if (currentPoll?.timeout) {
        clearTimeout(currentPoll.timeout);
      }
      delete currentPolls[queryCacheKey];
      return;
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval;

    if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
      startNextPoll({ queryCacheKey }, api);
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
