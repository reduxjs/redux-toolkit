import type { Action, PayloadAction, UnknownAction } from '@reduxjs/toolkit'
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
  QueryKeys,
} from './apiState'
import { QueryStatus } from './apiState'
import type {
  MutationThunk,
  QueryThunk,
  QueryThunkArg,
  RejectedAction,
} from './buildThunks'
import { calculateProvidedByThunk } from './buildThunks'
import type {
  AssertTagTypes,
  DefinitionType,
  EndpointDefinitions,
  FullTagDescription,
  QueryArgFrom,
  QueryDefinition,
  ResultTypeFrom,
} from '../endpointDefinitions'
import type { Patch } from 'immer'
import { isDraft } from 'immer'
import { applyPatches, original } from 'immer'
import { onFocus, onFocusLost, onOffline, onOnline } from './setupListeners'
import {
  isDocumentVisible,
  isOnline,
  copyWithStructuralSharing,
} from '../utils'
import type { ApiContext } from '../apiTypes'
import { isUpsertQuery } from './buildInitiate'
import type { InternalSerializeQueryArgs } from '../defaultSerializeQueryArgs'

/**
 * A typesafe single entry to be upserted into the cache
 */
export type NormalizedQueryUpsertEntry<
  Definitions extends EndpointDefinitions,
  EndpointName extends QueryKeys<Definitions>,
> = {
  endpointName: EndpointName
  arg: QueryArgFrom<Definitions[EndpointName]>
  value: ResultTypeFrom<Definitions[EndpointName]>
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
}

/**
 * A typesafe representation of a util action creator that accepts cache entry descriptions to upsert
 */
export type UpsertEntries<Definitions extends EndpointDefinitions> = (<
  EndpointNames extends Array<QueryKeys<Definitions>>,
>(
  entries: [
    ...{
      [I in keyof EndpointNames]: NormalizedQueryUpsertEntry<
        Definitions,
        EndpointNames[I]
      >
    },
  ],
) => PayloadAction<NormalizedQueryUpsertEntryPayload[]>) & {
  match: (
    action: unknown,
  ) => action is PayloadAction<NormalizedQueryUpsertEntryPayload[]>
}

function updateQuerySubstateIfExists(
  state: QueryState<any>,
  queryCacheKey: QueryCacheKey,
  update: (substate: QuerySubState<any>) => void,
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

const initialState = {} as any

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
    } & { startedTimeStamp: number },
  ) {
    draft[arg.queryCacheKey] ??= {
      status: QueryStatus.uninitialized,
      endpointName: arg.endpointName,
    }

    updateQuerySubstateIfExists(draft, arg.queryCacheKey, (substate) => {
      substate.status = QueryStatus.pending

      substate.requestId =
        upserting && substate.requestId
          ? // for `upsertQuery` **updates**, keep the current `requestId`
            substate.requestId
          : // for normal queries or `upsertQuery` **inserts** always update the `requestId`
            meta.requestId
      if (arg.originalArgs !== undefined) {
        substate.originalArgs = arg.originalArgs
      }
      substate.startedTimeStamp = meta.startedTimeStamp
    })
  }

  function writeFulfilledCacheEntry(
    draft: QueryState<any>,
    meta: {
      arg: QueryThunkArg
      requestId: string
      // requestStatus: 'fulfilled'
    } & {
      fulfilledTimeStamp: number
      baseQueryMeta: unknown
      // RTK_autoBatch: true
    },
    payload: unknown,
    upserting: boolean,
  ) {
    updateQuerySubstateIfExists(draft, meta.arg.queryCacheKey, (substate) => {
      if (substate.requestId !== meta.requestId && !upserting) return
      const { merge } = definitions[meta.arg.endpointName] as QueryDefinition<
        any,
        any,
        any,
        any
      >
      substate.status = QueryStatus.fulfilled

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
                isDraft(substate.data)
                  ? original(substate.data)
                  : substate.data,
                payload,
              )
            : payload
      }

      delete substate.error
      substate.fulfilledTimeStamp = meta.fulfilledTimeStamp
    })
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
            {
              RTK_autoBatch: boolean
              requestId: string
              timestamp: number
            }
          >,
        ) {
          for (const entry of action.payload) {
            const { queryDescription: arg, value } = entry
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
        prepare: (payload: NormalizedQueryUpsertEntryPayload[]) => {
          const queryDescriptions: ProcessedQueryUpsertEntry[] = payload.map(
            (entry) => {
              const { endpointName, arg, value } = entry
              const endpointDefinition = definitions[endpointName]
              const queryDescription: QueryThunkArg = {
                type: 'query',
                endpointName: endpointName,
                originalArgs: entry.arg,
                queryCacheKey: serializeQueryArgs({
                  queryArgs: arg,
                  endpointDefinition,
                  endpointName,
                }),
              }
              return { queryDescription, value }
            },
          )

          const result = {
            payload: queryDescriptions,
            meta: {
              [SHOULD_AUTOBATCH]: true,
              requestId: nanoid(),
              timestamp: Date.now(),
            },
          }
          return result
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
                  substate.status = QueryStatus.rejected
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
              entry?.status === QueryStatus.fulfilled ||
              entry?.status === QueryStatus.rejected
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
              status: QueryStatus.pending,
              endpointName: arg.endpointName,
              startedTimeStamp,
            }
          },
        )
        .addCase(mutationThunk.fulfilled, (draft, { payload, meta }) => {
          if (!meta.arg.track) return

          updateMutationSubstateIfExists(draft, meta, (substate) => {
            if (substate.requestId !== meta.requestId) return
            substate.status = QueryStatus.fulfilled
            substate.data = payload
            substate.fulfilledTimeStamp = meta.fulfilledTimeStamp
          })
        })
        .addCase(mutationThunk.rejected, (draft, { payload, error, meta }) => {
          if (!meta.arg.track) return

          updateMutationSubstateIfExists(draft, meta, (substate) => {
            if (substate.requestId !== meta.requestId) return

            substate.status = QueryStatus.rejected
            substate.error = (payload ?? error) as any
          })
        })
        .addMatcher(hasRehydrationInfo, (draft, action) => {
          const { mutations } = extractRehydrationInfo(action)!
          for (const [key, entry] of Object.entries(mutations)) {
            if (
              // do not rehydrate entries that were currently in flight.
              (entry?.status === QueryStatus.fulfilled ||
                entry?.status === QueryStatus.rejected) &&
              // only rehydrate endpoints that were persisted using a `fixedCacheKey`
              key !== entry?.requestId
            ) {
              draft[key] = entry
            }
          }
        })
    },
  })

  const invalidationSlice = createSlice({
    name: `${reducerPath}/invalidation`,
    initialState: initialState as InvalidationState<string>,
    reducers: {
      updateProvidedBy: {
        reducer(
          draft,
          action: PayloadAction<{
            queryCacheKey: QueryCacheKey
            providedTags: readonly FullTagDescription<string>[]
          }>,
        ) {
          const { queryCacheKey, providedTags } = action.payload

          for (const tagTypeSubscriptions of Object.values(draft)) {
            for (const idSubscriptions of Object.values(tagTypeSubscriptions)) {
              const foundAt = idSubscriptions.indexOf(queryCacheKey)
              if (foundAt !== -1) {
                idSubscriptions.splice(foundAt, 1)
              }
            }
          }

          for (const { type, id } of providedTags) {
            const subscribedQueries = ((draft[type] ??= {})[
              id || '__internal_without_id'
            ] ??= [])
            const alreadySubscribed = subscribedQueries.includes(queryCacheKey)
            if (!alreadySubscribed) {
              subscribedQueries.push(queryCacheKey)
            }
          }
        },
        prepare: prepareAutoBatched<{
          queryCacheKey: QueryCacheKey
          providedTags: readonly FullTagDescription<string>[]
        }>(),
      },
    },
    extraReducers(builder) {
      builder
        .addCase(
          querySlice.actions.removeQueryResult,
          (draft, { payload: { queryCacheKey } }) => {
            for (const tagTypeSubscriptions of Object.values(draft)) {
              for (const idSubscriptions of Object.values(
                tagTypeSubscriptions,
              )) {
                const foundAt = idSubscriptions.indexOf(queryCacheKey)
                if (foundAt !== -1) {
                  idSubscriptions.splice(foundAt, 1)
                }
              }
            }
          },
        )
        .addMatcher(hasRehydrationInfo, (draft, action) => {
          const { provided } = extractRehydrationInfo(action)!
          for (const [type, incomingTags] of Object.entries(provided)) {
            for (const [id, cacheKeys] of Object.entries(incomingTags)) {
              const subscribedQueries = ((draft[type] ??= {})[
                id || '__internal_without_id'
              ] ??= [])
              for (const queryCacheKey of cacheKeys) {
                const alreadySubscribed =
                  subscribedQueries.includes(queryCacheKey)
                if (!alreadySubscribed) {
                  subscribedQueries.push(queryCacheKey)
                }
              }
            }
          }
        })
        .addMatcher(
          isAnyOf(isFulfilled(queryThunk), isRejectedWithValue(queryThunk)),
          (draft, action) => {
            const providedTags = calculateProvidedByThunk(
              action,
              'providesTags',
              definitions,
              assertTagType,
            )
            const { queryCacheKey } = action.meta.arg

            invalidationSlice.caseReducers.updateProvidedBy(
              draft,
              invalidationSlice.actions.updateProvidedBy({
                queryCacheKey,
                providedTags,
              }),
            )
          },
        )
    },
  })

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

  const reducer: typeof combinedReducer = (state, action) =>
    combinedReducer(resetApiState.match(action) ? undefined : state, action)

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
