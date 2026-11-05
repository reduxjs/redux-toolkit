import type { FullTagDescription } from '../../endpointDefinitions'
import type { SubscribersInternal } from '../apiState'
import type {
  InfiniteQueryActionCreatorResult,
  MutationActionCreatorResult,
  QueryActionCreatorResult,
} from '../buildInitiate'
import type { SubMiddlewareApi, TimeoutId } from './types'

export type QueryPollState = {
  nextPollTimestamp: number
  timeout?: TimeoutId
  pollingInterval: number
}

export type CacheLifecycle = {
  valueResolved?(value: { data: unknown; meta: unknown }): unknown
  cacheEntryRemoved(): void
  // requests started while this lifecycle was waiting for its first data
  requestIds?: Set<string>
}

export type RequestLifecycle = {
  resolve(value: { data: unknown; meta: unknown }): unknown
  reject(value: unknown): unknown
}

export type RunningQuery =
  | QueryActionCreatorResult<any>
  | InfiniteQueryActionCreatorResult<any>

/**
 * Everything the middleware and `initiate` track for one query cache key in
 * one store. A field is `undefined` when that part of the key is idle.
 */
export interface QueryKeyRecord {
  readonly key: string
  subscribers?: SubscribersInternal
  request?: RunningQuery
  gc?: TimeoutId
  poll?: QueryPollState
  cacheLifecycle?: CacheLifecycle
}

export interface StoreRuntime {
  queries: Map<string, QueryKeyRecord>
  runningMutations: Map<string, MutationActionCreatorResult<any> | undefined>
  mutationCacheLifecycles: Map<string, CacheLifecycle>
  requestLifecycles: Map<string, RequestLifecycle>
  pendingRequestIds: Set<string>
  pendingTagInvalidations: FullTagDescription<string>[]
  subscriptionSync: {
    /** Keys whose subscribers changed since the last sync to the store */
    changedKeys: Set<string>
    /**
     * Keys the sync has written to the store, so removals of keys that were
     * never synced do not cause an extra sync
     */
    syncedKeys: Set<string>
    timer?: TimeoutId
  }
  pendingPollingUpdates: {
    keys: Set<string>
    timer?: TimeoutId
  }
  /** The thunk middleware's `extraArgument`, read on first use */
  extra?: { value: unknown }
  pollsView?: PollsView
  /** Test-only: how often `updatePollingInterval` ran for each key */
  pollUpdateCounters?: Record<string, number>
  /**
   * Clears every timer, subscriber and cache lifecycle, and aborts running
   * requests. Called for `resetApiState`.
   */
  reset(): void
}

export type PollsView = {
  has(key: string): boolean
  get(key: string): QueryPollState | undefined
}

export function createStoreRuntime(): StoreRuntime {
  const queries = new Map<string, QueryKeyRecord>()
  const runtime: StoreRuntime = {
    queries,
    runningMutations: new Map(),
    mutationCacheLifecycles: new Map(),
    requestLifecycles: new Map(),
    pendingRequestIds: new Set(),
    pendingTagInvalidations: [],
    subscriptionSync: { changedKeys: new Set(), syncedKeys: new Set() },
    pendingPollingUpdates: { keys: new Set() },
    reset: () => resetStoreRuntime(runtime),
  }
  return runtime
}

function resetStoreRuntime(runtime: StoreRuntime) {
  const { subscriptionSync, pendingPollingUpdates } = runtime
  clearTimeout(subscriptionSync.timer)
  subscriptionSync.timer = undefined
  subscriptionSync.changedKeys.clear()
  subscriptionSync.syncedKeys.clear()
  clearTimeout(pendingPollingUpdates.timer)
  pendingPollingUpdates.timer = undefined
  pendingPollingUpdates.keys.clear()
  runtime.pendingRequestIds.clear()
  runtime.pendingTagInvalidations = []

  const removedLifecycles: CacheLifecycle[] = []
  for (const record of runtime.queries.values()) {
    record.subscribers = undefined
    clearTimeout(record.gc)
    record.gc = undefined
    clearTimeout(record.poll?.timeout)
    record.poll = undefined
    if (record.cacheLifecycle) {
      removedLifecycles.push(record.cacheLifecycle)
      record.cacheLifecycle = undefined
    }
    // An aborted request removes itself from the record when it settles
    record.request?.abort()
    pruneRecord(runtime, record.key)
  }
  for (const promise of runtime.runningMutations.values()) {
    promise?.abort()
  }
  removedLifecycles.push(...runtime.mutationCacheLifecycles.values())
  runtime.mutationCacheLifecycles.clear()

  for (const lifecycle of removedLifecycles) {
    lifecycle.cacheEntryRemoved()
  }
}

export function ensureRecord(
  runtime: StoreRuntime,
  key: string,
): QueryKeyRecord {
  let record = runtime.queries.get(key)
  if (!record) {
    record = { key }
    runtime.queries.set(key, record)
  }
  return record
}

/** Deletes the record once no field holds it. */
export function pruneRecord(runtime: StoreRuntime, key: string) {
  const record = runtime.queries.get(key)
  if (
    record &&
    !record.subscribers &&
    !record.request &&
    !record.gc &&
    !record.poll &&
    !record.cacheLifecycle
  ) {
    runtime.queries.delete(key)
  }
}

export function getThunkExtra(
  runtime: StoreRuntime,
  dispatch: SubMiddlewareApi['dispatch'],
): unknown {
  return (runtime.extra ??= {
    value: dispatch((_, __, extra) => extra),
  }).value
}

export function getPollsView(runtime: StoreRuntime): PollsView {
  return (runtime.pollsView ??= {
    has: (key) => !!runtime.queries.get(key)?.poll,
    get: (key) => runtime.queries.get(key)?.poll,
  })
}
