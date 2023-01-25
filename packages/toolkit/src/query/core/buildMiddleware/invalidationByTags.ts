import {
  isAnyOf,
  isFulfilled,
  isRejected,
  isRejectedWithValue,
} from '../rtkImports'

import type { FullTagDescription } from '../../endpointDefinitions'
import { calculateProvidedBy } from '../../endpointDefinitions'
import type { QueryCacheKey } from '../apiState'
import { QueryStatus } from '../apiState'
import { calculateProvidedByThunk } from '../buildThunks'
import type {
  SubMiddlewareApi,
  InternalHandlerBuilder,
  ApiMiddlewareInternalHandler,
  InternalMiddlewareState,
} from './types'
import { countObjectKeys } from '../../utils/countObjectKeys'

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
  const {
    removeQueryResult,
    addPendingTagInvalidations,
    clearPendingTagInvalidations,
  } = api.internalActions
  const isThunkActionWithTags = isAnyOf(
    isFulfilled(mutationThunk),
    isRejectedWithValue(mutationThunk)
  )

  const isQueryEnd = isAnyOf(
    isFulfilled(mutationThunk),
    isRejected(mutationThunk),
    isFulfilled(queryThunk),
    isRejected(queryThunk)
  )

  const handler: ApiMiddlewareInternalHandler = (action, mwApi) => {
    if (isThunkActionWithTags(action)) {
      processPendingTagInvalidations(
        calculateProvidedByThunk(
          action,
          'invalidatesTags',
          endpointDefinitions,
          assertTagType
        ),
        mwApi,
        internalState
      )
    } else if (isQueryEnd(action)) {
      processPendingTagInvalidations([], mwApi, internalState)
    } else if (api.util.invalidateTags.match(action)) {
      processPendingTagInvalidations(
        calculateProvidedBy(
          action.payload,
          undefined,
          undefined,
          undefined,
          undefined,
          assertTagType
        ),
        mwApi,
        internalState
      )
    }
  }

  function processPendingTagInvalidations(
    tags: readonly FullTagDescription<string>[],
    mwApi: SubMiddlewareApi,
    internalState: InternalMiddlewareState
  ) {
    const rootState = mwApi.getState()

    const state = rootState[reducerPath]

    if (state.config.invalidateImmediately) {
      handleInvalidatedTags(tags, mwApi)
      return
    }

    const hasPendingQueries = Object.values(state.queries).some(
      (x) => x?.status === QueryStatus.pending
    )
    const hasPendingMutations = Object.values(state.mutations).some(
      (x) => x?.status === QueryStatus.pending
    )

    if (hasPendingQueries || hasPendingMutations) {
      if (tags && tags.length > 0)
        mwApi.dispatch(addPendingTagInvalidations(tags))
    } else {
      handleInvalidatedTags(tags, mwApi)
    }
  }

  function handleInvalidatedTags(
    newTags: readonly FullTagDescription<string>[],
    mwApi: SubMiddlewareApi
  ) {
    const rootState = mwApi.getState()
    const state = rootState[reducerPath]

    const tags = [...state.pendingTagInvalidations, ...newTags]
    if (tags.length === 0) return

    const toInvalidate = api.util.selectInvalidatedBy(rootState, tags)

    context.batch(() => {
      if (state.pendingTagInvalidations.length > 0)
        mwApi.dispatch(clearPendingTagInvalidations())

      const valuesArray = Array.from(toInvalidate.values())
      for (const { queryCacheKey } of valuesArray) {
        const querySubState = state.queries[queryCacheKey]
        const subscriptionSubState =
          internalState.currentSubscriptions[queryCacheKey] ?? {}

        if (querySubState) {
          if (countObjectKeys(subscriptionSubState) === 0) {
            mwApi.dispatch(
              removeQueryResult({
                queryCacheKey: queryCacheKey as QueryCacheKey,
              })
            )
          } else if (querySubState.status !== QueryStatus.uninitialized) {
            mwApi.dispatch(refetchQuery(querySubState, queryCacheKey))
          }
        }
      }
    })
  }

  return handler
}
