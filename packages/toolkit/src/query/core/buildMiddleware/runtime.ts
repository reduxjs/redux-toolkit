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
 * The request a query cache key is waiting for. The middleware registers it
 * on `pending`. `initiate` attaches its promise right after dispatching, and
 * removes the request once that promise settles.
 */
export type RunningRequest = {
  readonly requestId: string
  promise?: RunningQuery
}

/**
 * Everything the middleware and `initiate` track for one query cache key in
 * one store. A field is `undefined` when that part of the key is idle.
 */
export interface QueryKeyRecord {
  readonly key: string
  subscribers?: SubscribersInternal
  request?: RunningRequest
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
  for (const key of runtime.queries.keys()) {
    const lifecycle = removeRecord(runtime, key, true)
    if (lifecycle) removedLifecycles.push(lifecycle)
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

/**
 * Makes a record consistent after a transition: no removal timer while the
 * key has subscribers, and no record once nothing holds it. Removal timers are
 * armed by the cache collection handler and polls by the polling handler,
 * because both restart on specific actions.
 */
export function normalizeRecord(runtime: StoreRuntime, key: string) {
  const record = runtime.queries.get(key)
  if (!record) return
  if (record.gc && record.subscribers?.size) {
    clearTimeout(record.gc)
    record.gc = undefined
  }
  pruneRecord(runtime, key)
}

/** A newer request for the key replaces the one it was waiting for. */
export function startRequest(
  runtime: StoreRuntime,
  key: string,
  requestId: string,
) {
  ensureRecord(runtime, key).request = { requestId }
}

/** Returns whether `requestId` is still the key's running request. */
export function attachRequestPromise(
  runtime: StoreRuntime,
  key: string,
  requestId: string,
  promise: RunningQuery,
): boolean {
  const request = runtime.queries.get(key)?.request
  if (request?.requestId !== requestId) return false
  request.promise = promise
  return true
}

/** Only the request's owner removes it, and only while it is still current. */
export function settleRequest(
  runtime: StoreRuntime,
  key: string,
  requestId: string,
) {
  const record = runtime.queries.get(key)
  if (record?.request?.requestId !== requestId) return
  record.request = undefined
  normalizeRecord(runtime, key)
}

export function setRemovalTimer(
  runtime: StoreRuntime,
  key: string,
  timer: TimeoutId,
) {
  const record = ensureRecord(runtime, key)
  clearTimeout(record.gc)
  record.gc = timer
}

export function clearRemovalTimer(runtime: StoreRuntime, key: string) {
  const record = runtime.queries.get(key)
  if (!record?.gc) return
  clearTimeout(record.gc)
  record.gc = undefined
  normalizeRecord(runtime, key)
}

export function setPoll(
  runtime: StoreRuntime,
  key: string,
  poll: QueryPollState,
) {
  const record = ensureRecord(runtime, key)
  clearTimeout(record.poll?.timeout)
  record.poll = poll
}

export function clearPoll(runtime: StoreRuntime, key: string) {
  const record = runtime.queries.get(key)
  if (!record?.poll) return
  clearTimeout(record.poll.timeout)
  record.poll = undefined
  normalizeRecord(runtime, key)
}

export function setCacheLifecycle(
  runtime: StoreRuntime,
  key: string,
  lifecycle: CacheLifecycle,
) {
  ensureRecord(runtime, key).cacheLifecycle = lifecycle
}

/**
 * The one removal path for a key: drops its subscribers, removal timer, poll
 * and cache lifecycle, and optionally aborts its running request. Returns the
 * cache lifecycle so the caller decides when `cacheEntryRemoved` runs.
 */
export function removeRecord(
  runtime: StoreRuntime,
  key: string,
  abortRequest: boolean,
): CacheLifecycle | undefined {
  const record = runtime.queries.get(key)
  if (!record) return undefined
  const { cacheLifecycle, request } = record
  record.subscribers = undefined
  clearTimeout(record.gc)
  record.gc = undefined
  clearTimeout(record.poll?.timeout)
  record.poll = undefined
  record.cacheLifecycle = undefined
  normalizeRecord(runtime, key)
  // The aborted request removes itself from the record when it settles
  if (abortRequest) request?.promise?.abort()
  return cacheLifecycle
}
