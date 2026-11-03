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
  subscriptions: SubscriptionsView
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

export interface SubscriptionsView extends Iterable<
  [string, SubscribersInternal]
> {
  readonly size: number
  get(key: string): SubscribersInternal | undefined
  has(key: string): boolean
  keys(): Iterable<string>
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
    subscriptions: createSubscriptionsView(queries),
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

/**
 * A read-only, `Map`-like view of the subscriber maps, returned by
 * `internal_getRTKQSubscriptions`.
 */
function createSubscriptionsView(
  queries: Map<string, QueryKeyRecord>,
): SubscriptionsView {
  function* entries(): Generator<[string, SubscribersInternal]> {
    for (const [key, record] of queries) {
      if (record.subscribers) yield [key, record.subscribers]
    }
  }
  return {
    get size() {
      let size = 0
      for (const _ of entries()) size++
      return size
    },
    get: (key) => queries.get(key)?.subscribers,
    has: (key) => !!queries.get(key)?.subscribers,
    *keys() {
      for (const [key] of entries()) yield key
    },
    [Symbol.iterator]: entries,
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
