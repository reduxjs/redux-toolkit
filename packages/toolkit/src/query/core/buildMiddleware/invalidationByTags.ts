import {
  isAnyOf,
  isFulfilled,
  isRejected,
  isRejectedWithValue,
} from '../rtkImports'

import type {
  EndpointDefinitions,
  FullTagDescription,
} from '../../endpointDefinitions'
import { calculateProvidedBy } from '../../endpointDefinitions'
import type { CombinedState, QueryCacheKey } from '../apiState'
import { QueryStatus, STATUS_UNINITIALIZED } from '../apiState'
import { isUpsertQuery } from '../buildInitiate'
import { calculateProvidedByThunk } from '../buildThunks'
import type {
  SubMiddlewareApi,
  InternalHandlerBuilder,
  ApiMiddlewareInternalHandler,
} from './types'
import { ensureRecord } from './runtime'

export const buildInvalidationByTagsHandler: InternalHandlerBuilder = ({
  reducerPath,
  context,
  context: { endpointDefinitions },
  mutationThunk,
  queryThunk,
  api,
  assertTagType,
  refetchQuery,
  runtime,
}) => {
  const { removeQueryResult } = api.internalActions
  const isThunkActionWithTags = isAnyOf(
    isFulfilled(mutationThunk),
    isRejectedWithValue(mutationThunk),
  )

  const isQueryEnd = isAnyOf(
    isFulfilled(queryThunk, mutationThunk),
    isRejected(queryThunk, mutationThunk),
  )
  const { pendingRequestIds } = runtime

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (
      queryThunk.pending.match(action) ||
      mutationThunk.pending.match(action)
    ) {
      pendingRequestIds.add(action.meta.requestId)
    }

    if (isQueryEnd(action)) {
      pendingRequestIds.delete(action.meta.requestId)
    }

    if (
      (queryThunk.fulfilled.match(action) ||
        queryThunk.rejected.match(action)) &&
      runtime.invalidatedRequestIds.delete(action.meta.requestId)
    ) {
      settleInvalidatedRequest(
        action.meta.arg.queryCacheKey,
        action.meta.requestId,
        isUpsertQuery(action.meta.arg),
        mwApi,
      )
    }

    if (isThunkActionWithTags(action)) {
      invalidateTags(
        calculateProvidedByThunk(
          action,
          'invalidatesTags',
          endpointDefinitions,
          assertTagType,
        ),
        mwApi,
      )
    } else if (isQueryEnd(action)) {
      invalidateTags([], mwApi)
    } else if (api.util.invalidateTags.match(action)) {
      invalidateTags(
        calculateProvidedBy(
          action.payload,
          undefined,
          undefined,
          undefined,
          undefined,
          assertTagType,
        ),
        mwApi,
      )
    }
  }

  function hasPendingRequests() {
    return pendingRequestIds.size > 0
  }

  function invalidateEntry(
    queryCacheKey: QueryCacheKey,
    mwApi: SubMiddlewareApi,
  ) {
    const querySubState = mwApi.getState()[reducerPath].queries[queryCacheKey]
    if (!querySubState) return
    if (!runtime.queries.get(queryCacheKey)?.subscribers?.size) {
      mwApi.dispatch(removeQueryResult({ queryCacheKey }))
    } else if (querySubState.status !== STATUS_UNINITIALIZED) {
      mwApi.dispatch(refetchQuery(querySubState, 'invalidation'))
    }
  }

  // An invalidated entry with a running request is decided once that request
  // has settled, so its own `initiate()` promise still gets its result.
  // An upsert that updates an existing entry keeps that entry's requestId, so
  // only a non-upsert request is checked against it.
  function settleInvalidatedRequest(
    queryCacheKey: QueryCacheKey,
    requestId: string,
    isUpsert: boolean,
    mwApi: SubMiddlewareApi,
  ) {
    if (runtime.queries.get(queryCacheKey)?.request) return
    const entry = mwApi.getState()[reducerPath].queries[queryCacheKey]
    if (!isUpsert && entry?.requestId !== requestId) return
    invalidateEntry(queryCacheKey, mwApi)
  }

  function invalidateTags(
    newTags: readonly FullTagDescription<string>[],
    mwApi: SubMiddlewareApi,
  ) {
    const rootState = mwApi.getState()
    const state = rootState[reducerPath]

    runtime.pendingTagInvalidations.push(...newTags)

    if (
      state.config.invalidationBehavior === 'delayed' &&
      hasPendingRequests()
    ) {
      return
    }

    const tags = runtime.pendingTagInvalidations
    runtime.pendingTagInvalidations = []
    if (tags.length === 0) return

    const toInvalidate = api.util.selectInvalidatedBy(rootState, tags)

    context.batch(() => {
      const valuesArray = Array.from(toInvalidate.values())
      for (const { queryCacheKey } of valuesArray) {
        const record = ensureRecord(runtime, queryCacheKey)
        record.subscribers ??= new Map()

        if (record.request) {
          runtime.invalidatedRequestIds.add(record.request.requestId)
        } else {
          invalidateEntry(queryCacheKey as QueryCacheKey, mwApi)
        }
      }
    })
  }

  return handler
}
