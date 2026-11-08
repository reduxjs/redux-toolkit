import type {
  Action,
  Middleware,
  ThunkDispatch,
  UnknownAction,
} from '@reduxjs/toolkit'
import type {
  EndpointDefinitions,
  FullTagDescription,
} from '../../endpointDefinitions'
import type { QueryStatus, QuerySubState, ApiRootState } from '../apiState'
import type { QueryThunkArg } from '../buildThunks'
import { createAction, isAction } from '../rtkImports'
import type { QueryStartReason } from '../../baseQueryTypes'
import { isUpsertQuery, startReasonSymbol } from '../buildInitiate'
import { buildBatchedActionsHandler } from './batchActions'
import { buildCacheCollectionHandler } from './cacheCollection'
import { buildCacheLifecycleHandler } from './cacheLifecycle'
import { buildDevCheckHandler } from './devMiddleware'
import { buildInvalidationByTagsHandler } from './invalidationByTags'
import { buildPollingHandler } from './polling'
import { buildQueryLifecycleHandler } from './queryLifecycle'
import { buildQueryRecordHandler } from './queryRecord'
import { registerMiddleware } from './registration'
import {
  releaseRequest,
  removeRecord,
  settleRemovedRequests,
  startRequest,
} from './runtime'
import type { BuildMiddlewareInput, InternalHandlerBuilder } from './types'
import { buildWindowEventHandler } from './windowEventHandling'
import type { ApiEndpointQuery } from '../module'
export type { ReferenceCacheCollection } from './cacheCollection'
export type {
  MutationCacheLifecycleApi,
  QueryCacheLifecycleApi,
  ReferenceCacheLifecycle,
} from './cacheLifecycle'
export type {
  MutationLifecycleApi,
  QueryLifecycleApi,
  ReferenceQueryLifecycle,
  TypedMutationOnQueryStarted,
  TypedQueryOnQueryStarted,
} from './queryLifecycle'
export type { SubscriptionSelectors } from './types'

/**
 * Handlers for API slice and rehydration actions, run in this order after
 * the reducer. Subscription sync runs before all of them, ahead of the
 * reducer, so cache collection sees the updated subscriber count when it
 * decides whether to start a removal timer. The query record handler runs
 * first, so the other handlers see the key's running request and an entry
 * removal has already cleared the key's record. Tag invalidation runs before
 * polling and the lifecycles, so refetches it starts are dispatched before
 * those handlers see the action that finished the last pending request.
 */
export const handlerBuilders: InternalHandlerBuilder[] = [
  buildQueryRecordHandler,
  buildDevCheckHandler,
  buildCacheCollectionHandler,
  buildInvalidationByTagsHandler,
  buildPollingHandler,
  buildCacheLifecycleHandler,
  buildQueryLifecycleHandler,
]

export function buildMiddleware<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string,
>(input: BuildMiddlewareInput<Definitions, ReducerPath, TagTypes>) {
  const { reducerPath, queryThunk, api, context, createRuntime } = input
  const { apiUid } = context

  const actions = {
    invalidateTags: createAction<
      Array<TagTypes | FullTagDescription<TagTypes> | null | undefined>
    >(`${reducerPath}/invalidateTags`),
  }

  const isThisApiSliceAction = (action: Action) =>
    action.type.startsWith(`${reducerPath}/`)

  const middleware: Middleware<
    {},
    ApiRootState<Definitions, string, ReducerPath>,
    ThunkDispatch<any, any, UnknownAction>
  > = (mwApi) => {
    let initialized = false

    const runtime = createRuntime(mwApi.dispatch, mwApi.getState)

    const builderArgs = {
      ...(input as any as BuildMiddlewareInput<
        EndpointDefinitions,
        string,
        string
      >),
      runtime,
      refetchQuery,
      isThisApiSliceAction,
      mwApi,
    }

    const handlers = handlerBuilders.map((build) => build(builderArgs))

    const batchedActionsHandler = buildBatchedActionsHandler(builderArgs)
    const windowEventsHandler = buildWindowEventHandler(builderArgs)

    return (next) => {
      return (action) => {
        if (!isAction(action)) {
          return next(action)
        }

        const mwApiWithNext = { ...mwApi, next }

        if (!initialized) {
          initialized = true
          registerMiddleware(api, mwApiWithNext, apiUid, reducerPath)
        }

        const stateBefore = mwApi.getState()

        // Registered before the reducer, so anything that reacts to the
        // pending entry already sees its running request
        if (queryThunk.pending.match(action)) {
          const { arg, requestId } = action.meta
          startRequest(
            runtime,
            arg.queryCacheKey,
            requestId,
            isUpsertQuery(arg),
            arg.startReason === 'nextPage'
              ? 'forward'
              : arg.startReason === 'previousPage'
                ? 'backward'
                : undefined,
          )
        } else if (
          queryThunk.fulfilled.match(action) ||
          queryThunk.rejected.match(action)
        ) {
          releaseRequest(runtime, action.meta.requestId)
        }

        // Cleared before the reducer, so a listener that subscribes to or
        // requests the key again while the entry is removed keeps its record
        const removed = api.internalActions.removeQueryResult.match(action)
          ? removeRecord(runtime, action.payload.queryCacheKey, 'removed')
          : undefined

        const [actionShouldContinue, internalProbeResult] =
          batchedActionsHandler(action, mwApiWithNext, stateBefore)

        let res: any

        if (actionShouldContinue) {
          res = next(action)
        } else {
          res = internalProbeResult
        }

        // Runs after the reducer so abort listeners that start a new request
        // for the same key see the cleared cache entry.
        if (api.util.resetApiState.match(action)) {
          runtime.reset()
        }
        if (removed) {
          settleRemovedRequests(runtime, removed.requests, 'removed')
          removed.cacheLifecycle?.cacheEntryRemoved('removed')
        }

        if (mwApi.getState()[reducerPath]) {
          // Only run these checks if the middleware is registered okay

          // This looks for actions that aren't specific to the API slice
          windowEventsHandler(action, mwApiWithNext, stateBefore)

          if (
            isThisApiSliceAction(action) ||
            context.hasRehydrationInfo(action)
          ) {
            // Only run these additional checks if the actions are part of the API slice,
            // or the action has hydration-related data
            for (const handler of handlers) {
              handler(action, mwApiWithNext, stateBefore)
            }
          }
        }

        return res
      }
    }
  }

  return { middleware, actions }

  function refetchQuery(
    querySubState: Exclude<
      QuerySubState<any>,
      { status: QueryStatus.uninitialized }
    >,
    startReason: QueryStartReason,
  ) {
    return (
      input.api.endpoints[querySubState.endpointName] as ApiEndpointQuery<
        any,
        any
      >
    ).initiate(querySubState.originalArgs as any, {
      subscribe: false,
      forceRefetch: true,
      [startReasonSymbol]: startReason,
    })
  }
}
