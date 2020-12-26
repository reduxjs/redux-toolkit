import { AnyAction, AsyncThunk, Middleware, MiddlewareAPI, ThunkDispatch } from '@reduxjs/toolkit';
import { QueryCacheKey, QueryStatus, QuerySubState, QuerySubstateIdentifier, RootState, Subscribers } from './apiState';
import { Api, ApiContext } from '../apiTypes';
import { MutationThunkArg, QueryThunkArg, ThunkResult } from './buildThunks';
import {
  AssertEntityTypes,
  calculateProvidedBy,
  EndpointDefinitions,
  FullEntityDescription,
} from '../endpointDefinitions';
import { onFocus, onOnline } from './setupListeners';
import { flatten } from '../utils';

type QueryStateMeta<T> = Record<string, undefined | T>;
type TimeoutId = ReturnType<typeof setTimeout>;

export function buildMiddleware<Definitions extends EndpointDefinitions, ReducerPath extends string>({
  reducerPath,
  context,
  context: { endpointDefinitions },
  queryThunk,
  mutationThunk,
  api,
  assertEntityType,
}: {
  reducerPath: ReducerPath;
  context: ApiContext<Definitions>;
  queryThunk: AsyncThunk<ThunkResult, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<ThunkResult, MutationThunkArg<any>, {}>;
  api: Api<any, EndpointDefinitions, ReducerPath, string>;
  assertEntityType: AssertEntityTypes;
}) {
  type MWApi = MiddlewareAPI<ThunkDispatch<any, any, AnyAction>, RootState<Definitions, string, ReducerPath>>;

  const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {};
  const { removeQueryResult, unsubscribeQueryResult, updateSubscriptionOptions } = api.internalActions;

  const currentPolls: QueryStateMeta<{ nextPollTimestamp: number; timeout?: TimeoutId; pollingInterval: number }> = {};
  const middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>> = (
    mwApi
  ) => (next) => (action) => {
    const result = next(action);

    if (mutationThunk.fulfilled.match(action)) {
      invalidateEntities(
        calculateProvidedBy(
          endpointDefinitions[action.meta.arg.endpoint].invalidates,
          action.payload.result,
          action.meta.arg.originalArgs,
          assertEntityType
        ),
        mwApi
      );
    }

    if (unsubscribeQueryResult.match(action)) {
      handleUnsubscribe(action.payload, mwApi);
    }

    if (updateSubscriptionOptions.match(action)) {
      updatePollingInterval(action.payload, mwApi);
    }
    if (queryThunk.pending.match(action) || (queryThunk.rejected.match(action) && action.meta.condition)) {
      updatePollingInterval(action.meta.arg, mwApi);
    }
    if (queryThunk.fulfilled.match(action) || (queryThunk.rejected.match(action) && !action.meta.condition)) {
      startNextPoll(action.meta.arg, mwApi);
    }

    if (onFocus.match(action)) {
      refetchValidQueries(mwApi, 'refetchOnFocus');
    }
    if (onOnline.match(action)) {
      refetchValidQueries(mwApi, 'refetchOnReconnect');
    }

    return result;
  };

  return { middleware };

  function refetchQuery(
    querySubState: Exclude<QuerySubState<any>, { status: QueryStatus.uninitialized }>,
    queryCacheKey: string,
    override: Partial<QueryThunkArg<any>> = {}
  ) {
    return queryThunk({
      endpoint: querySubState.endpoint,
      originalArgs: querySubState.originalArgs,
      internalQueryArgs: querySubState.internalQueryArgs,
      subscribe: false,
      forceRefetch: true,
      startedTimeStamp: Date.now(),
      queryCacheKey: queryCacheKey as any,
      ...override,
    });
  }

  function refetchValidQueries(api: MWApi, type: 'refetchOnFocus' | 'refetchOnReconnect') {
    const state = api.getState()[reducerPath];
    const queries = state.queries;
    const subscriptions = state.subscriptions;

    context.batch(() => {
      for (const queryCacheKey of Object.keys(subscriptions)) {
        const querySubState = queries[queryCacheKey];
        const subscriptionSubState = subscriptions[queryCacheKey];

        if (!subscriptionSubState || !querySubState || querySubState.status === QueryStatus.uninitialized) return;

        const shouldRefetch =
          Object.values(subscriptionSubState).some((sub) => sub[type] === true) ||
          (Object.values(subscriptionSubState).every((sub) => sub[type] === undefined) && state.config[type]);

        if (shouldRefetch) {
          api.dispatch(refetchQuery(querySubState, queryCacheKey));
        }
      }
    });
  }

  function invalidateEntities(entities: readonly FullEntityDescription<string>[], api: MWApi) {
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
            flatten(Object.values(provided))) ?? [];

      for (const invalidate of invalidateSubscriptions) {
        toInvalidate.add(invalidate);
      }
    }

    context.batch(() => {
      for (const queryCacheKey of toInvalidate.values()) {
        const querySubState = state.queries[queryCacheKey];
        const subscriptionSubState = state.subscriptions[queryCacheKey];
        if (querySubState && subscriptionSubState) {
          if (Object.keys(subscriptionSubState).length === 0) {
            api.dispatch(removeQueryResult({ queryCacheKey }));
          } else if (querySubState.status !== QueryStatus.uninitialized) {
            api.dispatch(refetchQuery(querySubState, queryCacheKey));
          } else {
          }
        }
      }
    });
  }

  function handleUnsubscribe({ queryCacheKey }: QuerySubstateIdentifier, api: MWApi) {
    const keepUnusedDataFor = api.getState()[reducerPath].config.keepUnusedDataFor;
    const currentTimeout = currentRemovalTimeouts[queryCacheKey];
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    currentRemovalTimeouts[queryCacheKey] = setTimeout(() => {
      const subscriptions = api.getState()[reducerPath].subscriptions[queryCacheKey];
      if (!subscriptions || Object.keys(subscriptions).length === 0) {
        api.dispatch(removeQueryResult({ queryCacheKey }));
      }
      delete currentRemovalTimeouts![queryCacheKey];
    }, keepUnusedDataFor * 1000);
  }

  function startNextPoll({ queryCacheKey }: QuerySubstateIdentifier, api: MWApi) {
    const state = api.getState()[reducerPath];
    const querySubState = state.queries[queryCacheKey];
    const subscriptions = state.subscriptions[queryCacheKey];

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
        api.dispatch(refetchQuery(querySubState, queryCacheKey));
      }, lowestPollingInterval),
    });
  }

  function updatePollingInterval({ queryCacheKey }: QuerySubstateIdentifier, api: MWApi) {
    const state = api.getState()[reducerPath];
    const querySubState = state.queries[queryCacheKey];
    const subscriptions = state.subscriptions[queryCacheKey];

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
