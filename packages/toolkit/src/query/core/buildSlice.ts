import type { PayloadAction, UnknownAction } from '@reduxjs/toolkit'
import {
  combineReducers,
  createAction,
  createSlice,
  isAnyOf,
  isFulfilled,
  isRejectedWithValue,
  createNextState,
  prepareAutoBatched,
  SHOULD_AUTOBATCH,
  nanoid,
} from './rtkImports'
import type {
  QuerySubstateIdentifier,
  QuerySubState,
  MutationSubstateIdentifier,
  MutationSubState,
  MutationState,
  QueryState,
  InvalidationState,
  Subscribers,
  QueryCacheKey,
  SubscriptionState,
  ConfigState,
  InfiniteQuerySubState,
  InfiniteQueryDirection,
} from './apiState'
import {
  STATUS_FULFILLED,
  STATUS_PENDING,
  QueryStatus,
  STATUS_REJECTED,
  STATUS_UNINITIALIZED,
} from './apiState'
import type {
  AllQueryKeys,
  QueryArgFromAnyQueryDefinition,
  DataFromAnyQueryDefinition,
  InfiniteQueryThunk,
  MutationThunk,
  Patch,
  QueryThunk,
  QueryThunkArg,
} from './buildThunks'
import { calculateProvidedByThunk } from './buildThunks'
import {
  ENDPOINT_QUERY,
  isAnyQueryDefinition,
  isInfiniteQueryDefinition,
  type AssertTagTypes,
  type EndpointDefinitions,
  type FullTagDescription,
  type QueryDefinition,
} from '../endpointDefinitions'
import { applyPatches, original, isDraft } from '../utils/immerImports'
import {
  INTERNAL_PREFIX,
  onFocus,
  onFocusLost,
  onOffline,
  onOnline,
} from './setupListeners'
import {
  isDocumentVisible,
  isOnline,
  copyWithStructuralSharing,
} from '../utils'
import type { ApiContext } from '../apiTypes'
import { isUpsertQuery } from './buildInitiate'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type { UnwrapPromise } from '../tsHelpers'
import { getCurrent } from '../utils/getCurrent'

/**
 * A typesafe single entry to be upserted into the cache
 */
export type NormalizedQueryUpsertEntry<
  Definitions extends EndpointDefinitions,
  EndpointName extends AllQueryKeys<Definitions>,
> = {
  endpointName: EndpointName
  arg: QueryArgFromAnyQueryDefinition<Definitions, EndpointName>
  value: DataFromAnyQueryDefinition<Definitions, EndpointName>
}

/**
 * The internal version that is not typesafe since we can't carry the generics through `createSlice`
 */
type NormalizedQueryUpsertEntryPayload = {
  endpointName: string
  arg: unknown
  value: unknown
}

export type ProcessedQueryUpsertEntry = {
  queryDescription: QueryThunkArg
  value: unknown
  providedTags: readonly FullTagDescription<string>[]
}

/**
 * Options for `upsertQueryEntries` that control how the write interacts with
 * requests for the same cache entries. All options default to `false`, which
 * keeps the existing behavior.
 */
export type UpsertEntriesOptions = {
  /**
   * If a fetch for the entry is in flight when this write happens, ignore
   * that fetch's data when it resolves, because it started before this
   * write. The fetch still settles the entry's status and error.
   *
   * Fetches started after this write are not affected.
   *
   * Whether this becomes the default in RTK 3.0 is undecided.
   */
  ignoreEarlierFetches?: boolean
  /**
   * Leave the request state (`status`, `requestId`, `error`,
   * `startedTimeStamp`, `fulfilledTimeStamp`) of entries that already have
   * a request unchanged, and only write `data`. Entries without a request
   * are created as `fulfilled`.
   *
   * Planned to become the default in RTK 3.0.
   */
  keepRequestState?: boolean
  /**
   * Do not restart the `keepUnusedDataFor` timer of entries that already
   * exist. New unsubscribed entries still get a normal timer.
   *
   * Planned to become the default in RTK 3.0.
   */
  keepUnusedDataTimer?: boolean
}

/**
 * A typesafe representation of a util action creator that accepts cache entry descriptions to upsert
 */
export type UpsertEntries<Definitions extends EndpointDefinitions> = (<
  EndpointNames extends Array<AllQueryKeys<Definitions>>,
>(
  entries: [
    ...{
      [I in keyof EndpointNames]: NormalizedQueryUpsertEntry<
        Definitions,
        EndpointNames[I]
      >
    },
  ],
  options?: UpsertEntriesOptions,
) => PayloadAction<NormalizedQueryUpsertEntryPayload[]>) & {
  match: (
    action: unknown,
  ) => action is PayloadAction<NormalizedQueryUpsertEntryPayload[]>
}

function updateQuerySubstateIfExists(
  state: QueryState<any>,
  queryCacheKey: QueryCacheKey,
  update: (substate: QuerySubState<any> | InfiniteQuerySubState<any>) => void,
) {
  const substate = state[queryCacheKey]
  if (substate) {
    update(substate)
  }
}

export function getMutationCacheKey(
  id:
    | MutationSubstateIdentifier
    | { requestId: string; arg: { fixedCacheKey?: string | undefined } },
): string
export function getMutationCacheKey(id: {
  fixedCacheKey?: string
  requestId?: string
}): string | undefined

export function getMutationCacheKey(
  id:
    | { fixedCacheKey?: string; requestId?: string }
    | MutationSubstateIdentifier
    | { requestId: string; arg: { fixedCacheKey?: string | undefined } },
): string | undefined {
  return ('arg' in id ? id.arg.fixedCacheKey : id.fixedCacheKey) ?? id.requestId
}

function updateMutationSubstateIfExists(
  state: MutationState<any>,
  id:
    | MutationSubstateIdentifier
    | { requestId: string; arg: { fixedCacheKey?: string | undefined } },
  update: (substate: MutationSubState<any>) => void,
) {
  const substate = state[getMutationCacheKey(id)]
  if (substate) {
    update(substate)
  }
}

function areTagsEqual(
  existing: readonly FullTagDescription<string>[] | undefined,
  next: readonly FullTagDescription<string>[],
) {
  if (!existing || existing.length !== next.length) return false
  for (let i = 0; i < next.length; i++) {
    if (existing[i].type !== next[i].type || existing[i].id !== next[i].id) {
      return false
    }
  }
  return true
}

const initialState = {} as any

type UpsertEntriesMeta = {
  RTK_autoBatch: boolean
  requestId: string
  timestamp: number
  options?: UpsertEntriesOptions
}

// `startedSeq` is the `seq` of the last request started for the entry,
// including `upsertQueryData` calls. `upsertQueryEntries` with
// `ignoreEarlierFetches` copies it to `ignoreDataUpToSeq`. Requests with a
// `seq` up to that value still settle the entry's request state when they
// finish, but their data is not written. `seq` only increases within one
// store, so later requests always pass.
function isIgnoredRequest(
  substate: { ignoreDataUpToSeq?: number } | undefined,
  seq: number | undefined,
) {
  const ignoreUpTo = substate?.ignoreDataUpToSeq
  return ignoreUpTo !== undefined && seq !== undefined && seq <= ignoreUpTo
}

export function buildSlice({
  reducerPath,
  queryThunk,
  mutationThunk,
  serializeQueryArgs,
  context: {
    endpointDefinitions: definitions,
    apiUid,
    extractRehydrationInfo,
    hasRehydrationInfo,
  },
  assertTagType,
  config,
}: {
  reducerPath: string
  queryThunk: QueryThunk
  infiniteQueryThunk: InfiniteQueryThunk<any>
  mutationThunk: MutationThunk
  serializeQueryArgs: InternalSerializeQueryArgs
  context: ApiContext<EndpointDefinitions>
  assertTagType: AssertTagTypes
  config: Omit<
    ConfigState<string>,
    'online' | 'focused' | 'middlewareRegistered'
  >
}) {
  const resetApiState = createAction(`${reducerPath}/resetApiState`)

  function writePendingCacheEntry(
    draft: QueryState<any>,
    arg: QueryThunkArg,
    upserting: boolean,
    meta: {
      arg: QueryThunkArg
      requestId: string
      // requestStatus: 'pending'
    } & { startedTimeStamp: number; seq?: number },
  ) {
    draft[arg.queryCacheKey] ??= {
      status: STATUS_UNINITIALIZED,
      endpointName: arg.endpointName,
    }

    updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
      // `upsertQuery` **updates** keep the current status and `requestId`.
      // The rejected reducer ignores an upsert's rejection because of the
      // `requestId` mismatch, so writing `pending` would never be undone.
      const isUpsertUpdate = upserting && substate.requestId
      if (!isUpsertUpdate) {
        substate.status = STATUS_PENDING
        substate.requestId = meta.requestId
      }
      if (meta.seq !== undefined) {
        substate.startedSeq = meta.seq
        // A new request in this store always has a higher `seq` than any
        // value recorded here, so a value at least as high came from
        // another store through preloaded or rehydrated state.
        if (isIgnoredRequest(substate, meta.seq)) {
          delete substate.ignoreDataUpToSeq
        }
      }
      if (arg.originalArgs !== undefined) {
        substate.originalArgs = arg.originalArgs
      }
      substate.startedTimeStamp = meta.startedTimeStamp

      const endpointDefinition = definitions[meta.arg.endpointName]

      if (isInfiniteQueryDefinition(endpointDefinition) && 'direction' in arg) {
        ;(substate as InfiniteQuerySubState<any>).direction =
          arg.direction as InfiniteQueryDirection
      }
    })
  }

  function writeFulfilledCacheEntry(
    draft: QueryState<any>,
    meta: { arg: QueryThunkArg; requestId: string; seq?: number } & {
      fulfilledTimeStamp: number
      baseQueryMeta: unknown
    },
    payload: unknown,
    upserting: boolean,
  ) {
    updateQuerySubstateIfExists(draft, meta.arg.queryCacheKey, (substate) => {
      if (substate.requestId !== meta.requestId && !upserting) return
      substate.status = STATUS_FULFILLED
      if (!isIgnoredRequest(substate, meta.seq)) {
        writeCacheData(substate, meta, payload)
      }
      delete substate.error
      substate.fulfilledTimeStamp = meta.fulfilledTimeStamp
    })
  }

  function writeCacheData(
    substate: QuerySubState<any> | InfiniteQuerySubState<any>,
    meta: { arg: QueryThunkArg; requestId: string } & {
      fulfilledTimeStamp: number
      baseQueryMeta: unknown
    },
    payload: unknown,
  ) {
    const { merge } = definitions[meta.arg.endpointName] as QueryDefinition<
      any,
      any,
      any,
      any
    >

    if (merge) {
      if (substate.data !== undefined) {
        const { fulfilledTimeStamp, arg, baseQueryMeta, requestId } = meta
        // There's existing cache data. Let the user merge it in themselves.
        // We're already inside an Immer-powered reducer, and the user could just mutate `substate.data`
        // themselves inside of `merge()`. But, they might also want to return a new value.
        // Try to let Immer figure that part out, save the result, and assign it to `substate.data`.
        let newData = createNextState(substate.data, (draftSubstateData) => {
          // As usual with Immer, you can mutate _or_ return inside here, but not both
          return merge(draftSubstateData, payload, {
            arg: arg.originalArgs,
            baseQueryMeta,
            fulfilledTimeStamp,
            requestId,
          })
        })
        substate.data = newData
      } else {
        // Presumably a fresh request. Just cache the response data.
        substate.data = payload
      }
    } else {
      // Assign or safely update the cache data.
      substate.data =
        (definitions[meta.arg.endpointName].structuralSharing ?? true)
          ? copyWithStructuralSharing(
              isDraft(substate.data) ? original(substate.data) : substate.data,
              payload,
            )
          : payload
    }
  }

  const querySlice = createSlice({
    name: `${reducerPath}/queries`,
    initialState: initialState as QueryState<any>,
    reducers: {
      removeQueryResult: {
        reducer(
          draft,
          {
            payload: { queryCacheKey },
          }: PayloadAction<QuerySubstateIdentifier>,
        ) {
          delete draft[queryCacheKey]
        },
        prepare: prepareAutoBatched<QuerySubstateIdentifier>(),
      },
      cacheEntriesUpserted: {
        reducer(
          draft,
          action: PayloadAction<
            ProcessedQueryUpsertEntry[],
            string,
            UpsertEntriesMeta
          >,
        ) {
          const { ignoreEarlierFetches, keepRequestState } =
            action.meta.options ?? {}
          for (const entry of action.payload) {
            const { queryDescription: arg, value } = entry
            const existing = draft[arg.queryCacheKey]

            if (ignoreEarlierFetches && existing?.startedSeq !== undefined) {
              existing.ignoreDataUpToSeq = existing.startedSeq
            }

            if (keepRequestState && existing?.requestId) {
              existing.originalArgs = arg.originalArgs
              writeCacheData(
                existing,
                {
                  arg,
                  requestId: action.meta.requestId,
                  fulfilledTimeStamp: action.meta.timestamp,
                  baseQueryMeta: {},
                },
                value,
              )
              continue
            }

            writePendingCacheEntry(draft, arg, true, {
              arg,
              requestId: action.meta.requestId,
              startedTimeStamp: action.meta.timestamp,
            })

            writeFulfilledCacheEntry(
              draft,
              {
                arg,
                requestId: action.meta.requestId,
                fulfilledTimeStamp: action.meta.timestamp,
                baseQueryMeta: {},
              },
              value,
              // We know we're upserting here
              true,
            )
          }
        },
        prepare: (
          payload: NormalizedQueryUpsertEntryPayload[],
          options?: UpsertEntriesOptions,
        ) => {
          const queryDescriptions: ProcessedQueryUpsertEntry[] = []
          for (const { endpointName, arg, value } of payload) {
            const endpointDefinition = definitions[endpointName]
            if (
              !endpointDefinition ||
              !isAnyQueryDefinition(endpointDefinition)
            ) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn(
                  `upsertQueryEntries: "${endpointName}" is not a query or infinite query endpoint. This entry will be skipped.`,
                )
              }
              continue
            }
            if (
              process.env.NODE_ENV !== 'production' &&
              typeof (value as PromiseLike<unknown> | undefined)?.then ===
                'function'
            ) {
              console.warn(
                `upsertQueryEntries: the value for "${endpointName}" is a promise. upsertQueryEntries stores values as-is, so await the promise and upsert the result instead.`,
              )
            }
            const queryDescription: QueryThunkArg = {
              type: ENDPOINT_QUERY as 'query',
              endpointName,
              originalArgs: arg,
              queryCacheKey: serializeQueryArgs({
                queryArgs: arg,
                endpointDefinition,
                endpointName,
              }),
              startReason: 'upsert',
            }
            let providedTags: readonly FullTagDescription<string>[]
            try {
              providedTags = calculateProvidedByThunk(
                {
                  type: 'UNKNOWN',
                  payload: value,
                  meta: {
                    requestStatus: 'fulfilled',
                    requestId: 'UNKNOWN',
                    arg: queryDescription,
                  },
                } as CalculateProvidedByAction,
                'providesTags',
                definitions,
                assertTagType,
              )
            } catch (error) {
              if (process.env.NODE_ENV !== 'production') {
                console.error(
                  `upsertQueryEntries: providesTags for "${endpointName}" threw an error. This entry will be skipped.`,
                  error,
                )
              }
              continue
            }
            queryDescriptions.push({ queryDescription, value, providedTags })
          }

          const meta: UpsertEntriesMeta = {
            [SHOULD_AUTOBATCH]: true,
            requestId: nanoid(),
            timestamp: Date.now(),
          }
          if (options) {
            meta.options = options
          }
          return { payload: queryDescriptions, meta }
        },
      },
      queryResultPatched: {
        reducer(
          draft,
          {
            payload: { queryCacheKey, patches },
          }: PayloadAction<
            QuerySubstateIdentifier & { patches: readonly Patch[] }
          >,
        ) {
          updateQuerySubstateIfExists(draft, queryCacheKey, (substate) => {
            substate.data = applyPatches(substate.data as any, patches.concat())
          })
        },
        prepare: prepareAutoBatched<
          QuerySubstateIdentifier & { patches: readonly Patch[] }
        >(),
      },
    },
    extraReducers(builder) {
      builder
        .addCase(queryThunk.pending, (draft, { meta, meta: { arg } }) => {
          const upserting = isUpsertQuery(arg)
          writePendingCacheEntry(draft, arg, upserting, meta)
        })
        .addCase(queryThunk.fulfilled, (draft, { meta, payload }) => {
          const upserting = isUpsertQuery(meta.arg)
          writeFulfilledCacheEntry(draft, meta, payload, upserting)
        })
        .addCase(
          queryThunk.rejected,
          (draft, { meta: { condition, arg, requestId }, error, payload }) => {
            updateQuerySubstateIfExists(
              draft,
              arg.queryCacheKey,
              (substate) => {
                if (condition) {
                  // request was aborted due to condition (another query already running)
                } else {
                  // request failed
                  if (substate.requestId !== requestId) return
                  substate.status = STATUS_REJECTED
                  substate.error = (payload ?? error) as any
                }
              },
            )
          },
        )
        .addMatcher(hasRehydrationInfo, (draft, action) => {
          const { queries } = extractRehydrationInfo(action)!
          for (const [key, entry] of Object.entries(queries)) {
            if (
              // do not rehydrate entries that were currently in flight.
              entry?.status === STATUS_FULFILLED ||
              entry?.status === STATUS_REJECTED
            ) {
              draft[key] = entry
            }
          }
        })
    },
  })
  const mutationSlice = createSlice({
    name: `${reducerPath}/mutations`,
    initialState: initialState as MutationState<any>,
    reducers: {
      removeMutationResult: {
        reducer(draft, { payload }: PayloadAction<MutationSubstateIdentifier>) {
          const cacheKey = getMutationCacheKey(payload)
          if (cacheKey in draft) {
            delete draft[cacheKey]
          }
        },
        prepare: prepareAutoBatched<MutationSubstateIdentifier>(),
      },
    },
    extraReducers(builder) {
      builder
        .addCase(
          mutationThunk.pending,
          (draft, { meta, meta: { requestId, arg, startedTimeStamp } }) => {
            if (!arg.track) return

            draft[getMutationCacheKey(meta)] = {
              requestId,
              status: STATUS_PENDING,
              endpointName: arg.endpointName,
              startedTimeStamp,
            }
          },
        )
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta }) => {
          if (!meta.arg.track) return

          updateMutationSubstateIfExists(draft, meta, (substate) => {
            if (substate.requestId !== meta.requestId) return
            substate.status = STATUS_FULFILLED
            substate.data = payload
            substate.fulfilledTimeStamp = meta.fulfilledTimeStamp
          })
        })
        .addCase(mutationThunk.rejected, (draft, { payload, error, meta }) => {
          if (!meta.arg.track) return

          updateMutationSubstateIfExists(draft, meta, (substate) => {
            if (substate.requestId !== meta.requestId) return

            substate.status = STATUS_REJECTED
            substate.error = (payload ?? error) as any
          })
        })
        .addMatcher(hasRehydrationInfo, (draft, action) => {
          const { mutations } = extractRehydrationInfo(action)!
          for (const [key, entry] of Object.entries(mutations)) {
            if (
              // do not rehydrate entries that were currently in flight.
              (entry?.status === STATUS_FULFILLED ||
                entry?.status === STATUS_REJECTED) &&
              // only rehydrate endpoints that were persisted using a `fixedCacheKey`
              key !== entry?.requestId
            ) {
              draft[key] = entry
            }
          }
        })
    },
  })

  type CalculateProvidedByAction = UnwrapPromise<
    | ReturnType<ReturnType<QueryThunk>>
    | ReturnType<ReturnType<InfiniteQueryThunk<any>>>
  >

  const initialInvalidationState: InvalidationState<string> = {
    tags: {},
    keys: {},
  }

  const invalidationSlice = createSlice({
    name: `${reducerPath}/invalidation`,
    initialState: initialInvalidationState,
    reducers: {
      updateProvidedBy: {
        reducer(
          draft,
          action: PayloadAction<
            Array<{
              queryCacheKey: QueryCacheKey
              providedTags: readonly FullTagDescription<string>[]
            }>
          >,
        ) {
          // Read `keys` without drafting it, so unchanged entries cost no copies
          const currentKeys = getCurrent(draft.keys)
          const writtenKeys = new Set<QueryCacheKey>()
          for (const { queryCacheKey, providedTags } of action.payload) {
            if (
              !writtenKeys.has(queryCacheKey) &&
              areTagsEqual(currentKeys[queryCacheKey], providedTags)
            ) {
              continue
            }
            writtenKeys.add(queryCacheKey)
            removeCacheKeyFromTags(draft, queryCacheKey)

            for (const { type, id } of providedTags) {
              const subscribedQueries = ((draft.tags[type] ??= {})[
                id ?? '__internal_without_id'
              ] ??= [])
              const alreadySubscribed =
                subscribedQueries.includes(queryCacheKey)
              if (!alreadySubscribed) {
                subscribedQueries.push(queryCacheKey)
              }
            }

            // Remove readonly from the providedTags array
            draft.keys[queryCacheKey] =
              providedTags as FullTagDescription<string>[]
          }
        },
        prepare: prepareAutoBatched<
          Array<{
            queryCacheKey: QueryCacheKey
            providedTags: readonly FullTagDescription<string>[]
          }>
        >(),
      },
    },
    extraReducers(builder) {
      builder
        .addCase(
          querySlice.actions.removeQueryResult,
          (draft, { payload: { queryCacheKey } }) => {
            removeCacheKeyFromTags(draft, queryCacheKey)
          },
        )
        .addMatcher(hasRehydrationInfo, (draft, action) => {
          const { provided } = extractRehydrationInfo(action)!
          for (const [type, incomingTags] of Object.entries(
            provided.tags ?? {},
          )) {
            for (const [id, cacheKeys] of Object.entries(incomingTags)) {
              const subscribedQueries = ((draft.tags[type] ??= {})[
                id ?? '__internal_without_id'
              ] ??= [])
              for (const queryCacheKey of cacheKeys) {
                const alreadySubscribed =
                  subscribedQueries.includes(queryCacheKey)
                if (!alreadySubscribed) {
                  subscribedQueries.push(queryCacheKey)
                }
                draft.keys[queryCacheKey] = provided.keys[queryCacheKey]
              }
            }
          }
        })
        .addMatcher(
          isAnyOf(isFulfilled(queryThunk), isRejectedWithValue(queryThunk)),
          (draft, action) => {
            // A failed upsert does not change the entry's data, so it keeps its tags
            if (isRejectedWithValue(action) && isUpsertQuery(action.meta.arg)) {
              return
            }
            writeProvidedTagsForQueries(draft, [action])
          },
        )
        .addMatcher(
          querySlice.actions.cacheEntriesUpserted.match,
          (draft, action) => {
            invalidationSlice.caseReducers.updateProvidedBy(
              draft,
              invalidationSlice.actions.updateProvidedBy(
                action.payload.map(({ queryDescription, providedTags }) => ({
                  queryCacheKey: queryDescription.queryCacheKey,
                  providedTags,
                })),
              ),
            )
          },
        )
    },
  })

  function removeCacheKeyFromTags(
    draft: InvalidationState<any>,
    queryCacheKey: QueryCacheKey,
  ) {
    const existingTags = getCurrent(draft.keys[queryCacheKey] ?? [])

    // Delete this cache key from any existing tags that may have provided it
    for (const tag of existingTags) {
      const tagType = tag.type
      const tagId = tag.id ?? '__internal_without_id'
      const tagSubscriptions = draft.tags[tagType]?.[tagId]

      if (tagSubscriptions) {
        draft.tags[tagType][tagId] = getCurrent(tagSubscriptions).filter(
          (qc) => qc !== queryCacheKey,
        )
      }
    }

    delete draft.keys[queryCacheKey]
  }

  function writeProvidedTagsForQueries(
    draft: InvalidationState<string>,
    actions: CalculateProvidedByAction[],
  ) {
    const providedByEntries = actions.map((action) => {
      const providedTags = calculateProvidedByThunk(
        action,
        'providesTags',
        definitions,
        assertTagType,
      )
      const { queryCacheKey } = action.meta.arg
      return { queryCacheKey, providedTags }
    })

    invalidationSlice.caseReducers.updateProvidedBy(
      draft,
      invalidationSlice.actions.updateProvidedBy(providedByEntries),
    )
  }

  // Dummy slice to generate actions
  const subscriptionSlice = createSlice({
    name: `${reducerPath}/subscriptions`,
    initialState: initialState as SubscriptionState,
    reducers: {
      updateSubscriptionOptions(
        d,
        a: PayloadAction<
          {
            endpointName: string
            requestId: string
            options: Subscribers[number]
          } & QuerySubstateIdentifier
        >,
      ) {
        // Dummy
      },
      unsubscribeQueryResult(
        d,
        a: PayloadAction<{ requestId: string } & QuerySubstateIdentifier>,
      ) {
        // Dummy
      },
      internal_getRTKQSubscriptions() {},
    },
  })

  const internalSubscriptionsSlice = createSlice({
    name: `${reducerPath}/internalSubscriptions`,
    initialState: initialState as SubscriptionState,
    reducers: {
      subscriptionsUpdated: {
        reducer(state, action: PayloadAction<Patch[]>) {
          return applyPatches(state, action.payload)
        },
        prepare: prepareAutoBatched<Patch[]>(),
      },
    },
  })

  const configSlice = createSlice({
    name: `${reducerPath}/config`,
    initialState: {
      online: isOnline(),
      focused: isDocumentVisible(),
      middlewareRegistered: false,
      ...config,
    } as ConfigState<string>,
    reducers: {
      middlewareRegistered(state, { payload }: PayloadAction<string>) {
        state.middlewareRegistered =
          state.middlewareRegistered === 'conflict' || apiUid !== payload
            ? 'conflict'
            : true
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(onOnline, (state) => {
          state.online = true
        })
        .addCase(onOffline, (state) => {
          state.online = false
        })
        .addCase(onFocus, (state) => {
          state.focused = true
        })
        .addCase(onFocusLost, (state) => {
          state.focused = false
        })
        // update the state to be a new object to be picked up as a "state change"
        // by redux-persist's `autoMergeLevel2`
        .addMatcher(hasRehydrationInfo, (draft) => ({ ...draft }))
    },
  })

  const combinedReducer = combineReducers({
    queries: querySlice.reducer,
    mutations: mutationSlice.reducer,
    provided: invalidationSlice.reducer,
    subscriptions: internalSubscriptionsSlice.reducer,
    config: configSlice.reducer,
  })

  const ownTypePrefix = `${reducerPath}/`

  // Every action the slices above handle has a type starting with the
  // reducerPath (slice actions, thunks, `resetApiState`) or `INTERNAL_PREFIX`
  // (`setupListeners` actions), or is a rehydration action. Redux's own
  // actions still run so a partial preloaded state gets its missing keys.
  function mayHandleAction(action: UnknownAction) {
    const { type } = action
    return (
      typeof type !== 'string' ||
      type.startsWith(ownTypePrefix) ||
      type.startsWith(INTERNAL_PREFIX) ||
      type.startsWith('@@redux/') ||
      hasRehydrationInfo(action)
    )
  }

  const isQueryFulfilled = isFulfilled(queryThunk)

  const reducer: typeof combinedReducer = (state, action) => {
    if (state !== undefined && !mayHandleAction(action)) {
      return state as ReturnType<typeof combinedReducer>
    }
    const nextState = combinedReducer(
      resetApiState.match(action) ? undefined : state,
      action,
    )
    // An ignored request's data was not written, so the tags provided by
    // the current data stay in place.
    if (
      state?.provided &&
      isQueryFulfilled(action) &&
      isIgnoredRequest(
        state.queries?.[action.meta.arg.queryCacheKey],
        action.meta.seq,
      )
    ) {
      return { ...nextState, provided: state.provided }
    }
    return nextState
  }

  const actions = {
    ...configSlice.actions,
    ...querySlice.actions,
    ...subscriptionSlice.actions,
    ...internalSubscriptionsSlice.actions,
    ...mutationSlice.actions,
    ...invalidationSlice.actions,
    resetApiState,
  }

  return { reducer, actions }
}
export type SliceActions = ReturnType<typeof buildSlice>['actions']
