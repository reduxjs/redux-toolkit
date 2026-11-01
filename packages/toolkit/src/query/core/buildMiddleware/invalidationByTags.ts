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
import { calculateProvidedByThunk } from '../buildThunks'
import type {
  SubMiddlewareApi,
  InternalHandlerBuilder,
  ApiMiddlewareInternalHandler,
} from './types'
import { getOrInsertComputed, createNewMap } from '../../utils/getOrInsert'

export const buildInvalidationByTagsHandler: InternalHandlerBuilder = ({
  reducerPath,
  context,
  context: { endpointDefinitions },
  mutationThunk,
  queryThunk,
  api,
  assertTagType,
  refetchQuery,
  internalState,
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
  let pendingTagInvalidations: FullTagDescription<string>[] = []
  // Track request IDs so we can avoid iterating over state every time
  const pendingRequestIds = new Set<string>()

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (api.util.resetApiState.match(action)) {
      pendingRequestIds.clear()
      pendingTagInvalidations = []
      return
    }

    if (
      queryThunk.pending.match(action) ||
      mutationThunk.pending.match(action)
    ) {
      pendingRequestIds.add(action.meta.requestId)
    }

    if (isQueryEnd(action)) {
      pendingRequestIds.delete(action.meta.requestId)
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

  function invalidateTags(
    newTags: readonly FullTagDescription<string>[],
    mwApi: SubMiddlewareApi,
  ) {
    const rootState = mwApi.getState()
    const state = rootState[reducerPath]

    pendingTagInvalidations.push(...newTags)

    if (
      state.config.invalidationBehavior === 'delayed' &&
      hasPendingRequests()
    ) {
      return
    }

    const tags = pendingTagInvalidations
    pendingTagInvalidations = []
    if (tags.length === 0) return

    const toInvalidate = api.util.selectInvalidatedBy(rootState, tags)

    context.batch(() => {
      const valuesArray = Array.from(toInvalidate.values())
      for (const { queryCacheKey } of valuesArray) {
        const querySubState = state.queries[queryCacheKey]
        const subscriptionSubState = getOrInsertComputed(
          internalState.currentSubscriptions,
          queryCacheKey,
          createNewMap,
        )

        if (querySubState) {
          if (subscriptionSubState.size === 0) {
            mwApi.dispatch(
              removeQueryResult({
                queryCacheKey: queryCacheKey as QueryCacheKey,
              }),
            )
          } else if (querySubState.status !== STATUS_UNINITIALIZED) {
            mwApi.dispatch(refetchQuery(querySubState))
          }
        }
      }
    })
  }

  return handler
}
