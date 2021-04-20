import {
  AnyAction,
  AsyncThunk,
  createAction,
  isAnyOf,
  isFulfilled,
  isRejectedWithValue,
  Middleware,
  MiddlewareAPI,
  ThunkDispatch,
} from '@reduxjs/toolkit';
import { QueryCacheKey, QueryStatus, QuerySubState, QuerySubstateIdentifier, RootState, Subscribers } from './apiState';
import { Api, ApiContext } from '../apiTypes';
import { calculateProvidedByThunk, MutationThunkArg, QueryThunkArg, ThunkResult } from './buildThunks';
import { AssertTagTypes, calculateProvidedBy, EndpointDefinitions, FullTagDescription } from '../endpointDefinitions';
import { onFocus, onOnline } from './setupListeners';
import { flatten } from '../utils';

type QueryStateMeta<T> = Record<string, undefined | T>;
type TimeoutId = ReturnType<typeof setTimeout>;

export function buildMiddleware<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string
>({
  reducerPath,
  context,
  context: { endpointDefinitions },
  queryThunk,
  mutationThunk,
  api,
  assertTagType,
}: {
  reducerPath: ReducerPath;
  context: ApiContext<Definitions>;
  queryThunk: AsyncThunk<ThunkResult, QueryThunkArg<any>, {}>;
  mutationThunk: AsyncThunk<ThunkResult, MutationThunkArg<any>, {}>;
  api: Api<any, EndpointDefinitions, ReducerPath, TagTypes>;
  assertTagType: AssertTagTypes;
}) {
  type MWApi = MiddlewareAPI<ThunkDispatch<any, any, AnyAction>, RootState<Definitions, string, ReducerPath>>;
  const { removeQueryResult, unsubscribeQueryResult, updateSubscriptionOptions, resetApiState } = api.internalActions;

  const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {};
  const currentPolls: QueryStateMeta<{ nextPollTimestamp: number; timeout?: TimeoutId; pollingInterval: number }> = {};

  const actions = {
    invalidateTags: createAction<Array<TagTypes | FullTagDescription<TagTypes>>>(`${reducerPath}/invalidateTags`),
  };

  const middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>> = (
    mwApi
  ) => (next) => (action) => {
    const result = next(action);

    if (isAnyOf(isFulfilled(mutationThunk), isRejectedWithValue(mutationThunk))(action)) {
      invalidateTags(calculateProvidedByThunk(action, 'invalidatesTags', endpointDefinitions, assertTagType), mwApi);
    }

    if (actions.invalidateTags.match(action)) {
      invalidateTags(calculateProvidedBy(action.payload, undefined, undefined, undefined, assertTagType), mwApi);
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

    if (resetApiState.match(action)) {
      for (const [key, poll] of Object.entries(currentPolls)) {
        if (poll?.timeout) clearTimeout(poll.timeout);
        delete currentPolls[key];
      }
      for (const [key, timeout] of Object.entries(currentRemovalTimeouts)) {
        if (timeout) clearTimeout(timeout);
        delete currentRemovalTimeouts[key];
      }
    }

    return result;
  };

  return { middleware, actions };

  function refetchQuery(
    querySubState: Exclude<QuerySubState<any>, { status: QueryStatus.uninitialized }>,
    queryCacheKey: string,
    override: Partial<QueryThunkArg<any>> = {}
  ) {
    return queryThunk({
      endpointName: querySubState.endpointName,
      originalArgs: querySubState.originalArgs,
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

  function invalidateTags(tags: readonly FullTagDescription<string>[], api: MWApi) {
    const state = api.getState()[reducerPath];

    const toInvalidate = new Set<QueryCacheKey>();
    for (const tag of tags) {
      const provided = state.provided[tag.type];
      if (!provided) {
        continue;
      }

      let invalidateSubscriptions =
        (tag.id !== undefined
          ? // id given: invalidate all queries that provide this type & id
            provided[tag.id]
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
