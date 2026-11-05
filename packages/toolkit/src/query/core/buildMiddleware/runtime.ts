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

/** Why a cache entry was removed while something still waited on it. */
export type RemovalReason = 'removed' | 'reset'

export type CacheLifecycle = {
  valueResolved?(value: { data: unknown; meta: unknown }): unknown
  cacheEntryRemoved(reason: RemovalReason): void
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
 * What a request's waiters see: the store state right after the request's own
 * `fulfilled` or `rejected` reached the reducer, or the reason its entry was
 * removed first.
 */
export type RequestOutcome = {
  state: unknown
  removed?: RemovalReason
}

/**
 * A query request between its `pending` and its own `fulfilled` or
 * `rejected`. The middleware registers it on `pending`; `initiate` attaches
 * its promise right after dispatching.
 */
export type RunningRequest = {
  readonly requestId: string
  readonly key: string
  readonly isUpsert: boolean
  promise?: RunningQuery
  abort?: () => void
  readonly outcome: Promise<RequestOutcome>
  /** Cleared once the outcome is settled */
  settle?: (outcome: RequestOutcome) => void
  removed?: RemovalReason
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
  /**
   * Every running query request by `requestId`, including ones whose entry
   * was removed or that a newer request replaced in the record
   */
  requests: Map<string, RunningRequest>
  /** Running requests whose entry was invalidated; decided when they settle */
  invalidatedRequestIds: Set<string>
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
  getState?: () => unknown
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
    requests: new Map(),
    invalidatedRequestIds: new Set(),
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
  runtime.invalidatedRequestIds.clear()

  const removedLifecycles: CacheLifecycle[] = []
  // Abort listeners can start new requests, which keep their new records
  for (const key of [...runtime.queries.keys()]) {
    const removed = removeRecord(runtime, key, 'reset')
    if (!removed) continue
    settleRemovedRequest(runtime, removed.request, 'reset')
    if (removed.cacheLifecycle) removedLifecycles.push(removed.cacheLifecycle)
  }
  for (const promise of runtime.runningMutations.values()) {
    promise?.abort()
  }
  removedLifecycles.push(...runtime.mutationCacheLifecycles.values())
  runtime.mutationCacheLifecycles.clear()

  for (const lifecycle of removedLifecycles) {
    lifecycle.cacheEntryRemoved('reset')
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

/**
 * Registers a request on `pending`. A forced `upsertQueryData` request only
 * registers when the key has no running request, because it does not replace
 * the running request's entry.
 */
export function startRequest(
  runtime: StoreRuntime,
  key: string,
  requestId: string,
  isUpsert: boolean,
) {
  const record = ensureRecord(runtime, key)
  if (isUpsert && record.request) return
  let settle!: (outcome: RequestOutcome) => void
  const outcome = new Promise<RequestOutcome>((resolve) => {
    settle = resolve
  })
  // Until `initiate` attaches its own promise, `getRunningQueryThunk` still
  // returns the request this one replaced
  const request: RunningRequest = {
    requestId,
    key,
    isUpsert,
    outcome,
    settle,
    promise: record.request?.promise,
  }
  runtime.requests.set(requestId, request)
  record.request = request
}

/**
 * Returns the request `initiate` started, if it is still running. Without a
 * `promise` (`upsertQueryData`), the running query thunks do not list it.
 */
export function attachRequestPromise(
  runtime: StoreRuntime,
  requestId: string,
  promise: RunningQuery | undefined,
  abort: () => void,
): RunningRequest | undefined {
  const request = runtime.requests.get(requestId)
  if (!request) return undefined
  request.promise = promise
  request.abort = promise ? () => promise.abort() : abort
  // Removed while its `pending` was still being handled
  if (request.removed) request.abort()
  return request
}

function settleOutcome(request: RunningRequest, outcome: RequestOutcome) {
  request.settle?.(outcome)
  request.settle = undefined
}

/**
 * The request a new `initiate` for this key joins. Between a request's
 * `fulfilled` or `rejected` and the reducer, only the still pending entry
 * points at it. An `upsertQueryData` that updates an existing entry leaves it
 * as it was, so it is only joined while the entry it created is pending.
 */
export function findRunningRequest(
  runtime: StoreRuntime,
  key: string,
  entry: { status: string; requestId?: string } | undefined,
): RunningRequest | undefined {
  const isPending = entry?.status === 'pending'
  const request = runtime.queries.get(key)?.request
  if (request) return request.isUpsert && !isPending ? undefined : request
  if (!isPending || !entry.requestId) return undefined
  const settling = runtime.requests.get(entry.requestId)
  return settling?.key === key && !settling.removed ? settling : undefined
}

/**
 * Takes a request off its record when its `fulfilled` or `rejected` arrives,
 * before the reducer, so anything reacting to the settled entry can start a
 * new request.
 */
export function releaseRequest(runtime: StoreRuntime, requestId: string) {
  const request = runtime.requests.get(requestId)
  if (!request) return
  const record = runtime.queries.get(request.key)
  if (record?.request === request) record.request = undefined
}

/**
 * Ends a request after its own `fulfilled` or `rejected` reached the reducer.
 * Its waiters get that state, unless its entry was removed first.
 */
export function finishRequest(
  runtime: StoreRuntime,
  requestId: string,
  state: unknown,
) {
  const request = runtime.requests.get(requestId)
  if (!request) return
  releaseRequest(runtime, requestId)
  runtime.requests.delete(requestId)
  settleOutcome(request, { state })
  normalizeRecord(runtime, request.key)
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

export type RemovedRecord = {
  cacheLifecycle?: CacheLifecycle
  request?: RunningRequest
}

/**
 * The one removal path for a key: drops its subscribers, removal timer, poll,
 * cache lifecycle and running request, and marks that request as removed.
 * The caller settles the request with `settleRemovedRequest` and runs
 * `cacheEntryRemoved` once the entry is gone from the state.
 */
export function removeRecord(
  runtime: StoreRuntime,
  key: string,
  reason: RemovalReason,
): RemovedRecord | undefined {
  const record = runtime.queries.get(key)
  if (!record) return undefined
  const { cacheLifecycle, request } = record
  record.subscribers = undefined
  clearTimeout(record.gc)
  record.gc = undefined
  clearTimeout(record.poll?.timeout)
  record.poll = undefined
  record.cacheLifecycle = undefined
  record.request = undefined
  if (request) {
    request.removed = reason
    runtime.invalidatedRequestIds.delete(request.requestId)
  }
  normalizeRecord(runtime, key)
  return { cacheLifecycle, request }
}

/**
 * Settles a removed request's waiters with `reason` and aborts it. Abort
 * listeners run synchronously, so this runs after the entry is removed. The
 * request stays in `runtime.requests` until its `rejected` arrives.
 */
export function settleRemovedRequest(
  runtime: StoreRuntime,
  request: RunningRequest | undefined,
  reason: RemovalReason,
) {
  if (!request) return
  settleOutcome(request, { state: runtime.getState?.(), removed: reason })
  request.abort?.()
}
