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

// Matches the way `selectInvalidatedBy` looks tags up: an invalidated tag
// without an id matches every id of its type, and ids are compared as object
// keys, so `1` and `'1'` are the same id
function tagMatches(
  provided: FullTagDescription<string>,
  invalidated: FullTagDescription<string>,
) {
  return (
    provided.type === invalidated.type &&
    (invalidated.id === undefined ||
      (provided.id !== undefined &&
        String(provided.id) === String(invalidated.id)))
  )
}

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
    if (queryThunk.pending.match(action)) {
      pendingRequestIds.add(action.meta.requestId)
      runtime.lastSeq = Math.max(runtime.lastSeq, action.meta.seq)
      if (isImmediate(mwApi)) {
        runtime.runningQuerySeqs.set(action.meta.requestId, action.meta.seq)
      }
    } else if (mutationThunk.pending.match(action)) {
      pendingRequestIds.add(action.meta.requestId)
      runtime.lastSeq = Math.max(runtime.lastSeq, action.meta.seq)
    }

    if (isQueryEnd(action)) {
      pendingRequestIds.delete(action.meta.requestId)
    }

    if (
      queryThunk.fulfilled.match(action) ||
      queryThunk.rejected.match(action)
    ) {
      const { requestId } = action.meta
      const { queryCacheKey } = action.meta.arg
      const invalidated = runtime.invalidatedRequestIds.delete(requestId)
      const loggedInvalidation = matchesInvalidationLog(
        requestId,
        queryCacheKey,
        mwApi,
      )
      if (invalidated || loggedInvalidation) {
        settleInvalidatedRequest(
          queryCacheKey,
          requestId,
          isUpsertQuery(action.meta.arg),
          mwApi,
        )
      }
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

  function isImmediate(mwApi: SubMiddlewareApi) {
    return (
      mwApi.getState()[reducerPath].config.invalidationBehavior ===
      'immediately'
    )
  }

  // Tags are only known once a request settles, so an invalidation that ran
  // while the request was running can miss an entry that the request's result
  // makes provide the tag (a first fetch, or a refetch that adds a tag).
  // Checked after the reducer wrote this request's provided tags.
  function matchesInvalidationLog(
    requestId: string,
    queryCacheKey: QueryCacheKey,
    mwApi: SubMiddlewareApi,
  ) {
    const startSeq = runtime.runningQuerySeqs.get(requestId)
    if (startSeq === undefined) return false
    runtime.runningQuerySeqs.delete(requestId)
    if (runtime.invalidationLog.length === 0) return false

    const provided =
      mwApi.getState()[reducerPath].provided.keys[queryCacheKey] ?? []
    const matched =
      provided.length > 0 &&
      runtime.invalidationLog.some(
        (entry) =>
          entry.seq >= startSeq &&
          entry.tags.some((tag) =>
            provided.some((providedTag) => tagMatches(providedTag, tag)),
          ),
      )

    let oldestRunningSeq = Infinity
    for (const seq of runtime.runningQuerySeqs.values()) {
      if (seq < oldestRunningSeq) oldestRunningSeq = seq
    }
    if (oldestRunningSeq === Infinity) {
      runtime.invalidationLog = []
    } else if (runtime.invalidationLog[0].seq < oldestRunningSeq) {
      runtime.invalidationLog = runtime.invalidationLog.filter(
        (entry) => entry.seq >= oldestRunningSeq,
      )
    }
    return matched
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

    if (
      state.config.invalidationBehavior === 'immediately' &&
      runtime.runningQuerySeqs.size > 0
    ) {
      runtime.invalidationLog.push({ seq: runtime.lastSeq, tags })
    }

    const toInvalidate = api.util.selectInvalidatedBy(rootState, tags)

    context.batch(() => {
      for (const { queryCacheKey } of toInvalidate) {
        const request = runtime.queries.get(queryCacheKey)?.request
        if (request) {
          runtime.invalidatedRequestIds.add(request.requestId)
        } else {
          invalidateEntry(queryCacheKey as QueryCacheKey, mwApi)
        }
      }
    })
  }

  return handler
}
