import { configureStore } from '@reduxjs/toolkit'
import { createApi, QueryStatus } from '@reduxjs/toolkit/query'
import type { QueryCacheKey } from '../core/apiState'
import type { StoreRuntime } from '../core/buildMiddleware/runtime'

// Random interleavings of the operations that touch one query cache key's
// runtime state, with cross-field checks after every step.

const KEYS = [0, 1, 2]
const SEQUENCES = Number(process.env.FUZZ_SEQUENCES ?? 200)
const STEPS = Number(process.env.FUZZ_STEPS ?? 50)
const SEED = Number(process.env.FUZZ_SEED ?? 1)
const KEEP_UNUSED_MS = 1000

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createFixture() {
  const api = createApi({
    baseQuery: () => ({ data: null }),
    keepUnusedDataFor: KEEP_UNUSED_MS / 1000,
    tagTypes: ['T'],
    endpoints: (build) => ({
      get: build.query<number, number>({
        async queryFn(arg) {
          await new Promise((resolve) => setTimeout(resolve, 30))
          return { data: arg }
        },
        providesTags: (_r, _e, arg) => [{ type: 'T', id: arg }],
        async onCacheEntryAdded(_arg, { cacheDataLoaded, cacheEntryRemoved }) {
          await cacheDataLoaded.catch(() => {})
          await cacheEntryRemoved
        },
      }),
    }),
  })
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) =>
      gDM({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
  })
  const runtime = store.dispatch({
    type: `${api.reducerPath}/getRuntime`,
  }) as unknown as StoreRuntime
  return { api, store, runtime }
}

type Fixture = ReturnType<typeof createFixture>
type Handle = {
  arg: number
  unsubscribe(): void
  requestId: string
  updateSubscriptionOptions(o: { pollingInterval: number }): void
}

export type Violation = { invariant: string; key: string; step: string }

const settledRequests = new WeakSet<object>()

function check(
  { api, store, runtime }: Fixture,
  step: string,
  out: Violation[],
) {
  const queries = store.getState().api.queries
  const keys = new Set([...Object.keys(queries), ...runtime.queries.keys()])
  for (const key of keys) {
    const entry = queries[key]
    const record = runtime.queries.get(key)
    const subCount = record?.subscribers?.size ?? 0
    const add = (invariant: string) => {
      out.push({ invariant, key, step })
      if (
        process.env.FUZZ_DEBUG &&
        invariant.includes(process.env.FUZZ_DEBUG)
      ) {
        throw new Error(
          `${invariant} ${key}\n${step}\n${JSON.stringify(
            {
              entry: entry && {
                status: entry.status,
                requestId: entry.requestId,
              },
              subscribers: record?.subscribers && [...record.subscribers],
              poll: record?.poll && {
                ...record.poll,
                timeout: !!record.poll.timeout,
              },
              gc: !!record?.gc,
            },
            null,
            2,
          )}`,
        )
      }
    }

    if (record?.gc && subCount > 0) add('gc timer armed while subscribed')
    if (record?.gc && !entry) add('gc timer armed for missing entry')
    if (entry && subCount === 0 && !record?.gc && !record?.request)
      add('unsubscribed entry with no gc timer and no request')

    const intervals = [...(record?.subscribers?.values() ?? [])]
      .map((o) => o.pollingInterval)
      .filter(
        (i): i is number =>
          typeof i === 'number' && i > 0 && Number.isFinite(i),
      )
    if (record?.poll && intervals.length === 0)
      add(
        `poll record with no polling subscriber (${record.subscribers ? 'subscribers map' : 'no subscribers map'}, entry ${entry?.status ?? 'missing'})`,
      )
    // A faster interval only reschedules when it moves the next poll earlier,
    // so the timer may still carry a slower interval than the lowest one
    if (record?.poll?.timeout && intervals.length > 0) {
      const lowest = Math.min(...intervals)
      if (record.poll.pollingInterval < lowest)
        add('poll interval faster than lowest subscriber interval')
      if (record.poll.nextPollTimestamp > Date.now() + lowest)
        add('next poll later than lowest subscriber interval')
    }
    if (
      intervals.length > 0 &&
      entry &&
      entry.status !== QueryStatus.pending &&
      entry.status !== QueryStatus.uninitialized &&
      !record?.poll?.timeout
    )
      add(`polling subscriber with ${entry.status} entry but no poll timer`)

    if (entry?.status === QueryStatus.pending && !record?.request)
      add('pending entry with no registered request')
    if (record?.request && entry?.status !== QueryStatus.pending) {
      const { request } = record
      add(`registered request for ${entry?.status ?? 'missing'} entry`)
      // Each step advances the clock, so a settled promise has run its
      // callbacks by the next check and the registration must be gone
      if (settledRequests.has(request))
        add('registered request outlives its settled promise')
      else
        request.promise?.then(
          () => settledRequests.add(request),
          () => settledRequests.add(request),
        )
    }

    if (record?.cacheLifecycle && !entry)
      add('cache lifecycle for missing entry')
    if (entry && !record?.cacheLifecycle) add('entry with no cache lifecycle')

    if (
      record &&
      subCount === 0 &&
      !record.request &&
      !record.gc &&
      !record.poll &&
      !record.cacheLifecycle
    )
      add('record held only by an empty subscriber map')
  }
}

export async function runFuzz(
  seed: number,
  sequences: number,
  steps: number,
  advance: (ms: number) => Promise<unknown>,
) {
  const random = mulberry32(seed)
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)]
  const violations: Violation[] = []

  for (let s = 0; s < sequences; s++) {
    const fixture = createFixture()
    const { api, store } = fixture
    let handles: Handle[] = []
    const log: string[] = []

    for (let i = 0; i < steps; i++) {
      const arg = pick(KEYS)
      const roll = random()
      let step: string
      if (roll < 0.25) {
        const subscribe = random() < 0.8
        const forceRefetch = random() < 0.2
        const pollingInterval = pick([0, 0, 50, 200])
        const handle = store.dispatch(
          api.endpoints.get.initiate(arg, {
            subscribe,
            forceRefetch,
            subscriptionOptions: { pollingInterval },
          }),
        )
        if (subscribe) handles.push(handle as unknown as Handle)
        step = `initiate(${arg}, sub=${subscribe}, force=${forceRefetch}, poll=${pollingInterval})`
      } else if (roll < 0.4 && handles.length) {
        const handle = pick(handles)
        handle.unsubscribe()
        handles = handles.filter((h) => h !== handle)
        step = `unsubscribe(${handle.arg}#${handle.requestId})`
      } else if (roll < 0.48 && handles.length) {
        const handle = pick(handles)
        const pollingInterval = pick([0, 50, 200, 400])
        handle.updateSubscriptionOptions({ pollingInterval })
        step = `updateOptions(${handle.arg}#${handle.requestId}, poll=${pollingInterval})`
      } else if (roll < 0.56) {
        store.dispatch(api.util.invalidateTags([{ type: 'T', id: arg }]))
        step = `invalidate(${arg})`
      } else if (roll < 0.63) {
        store.dispatch(api.util.upsertQueryData('get', arg, arg * 10))
        step = `upsertQueryData(${arg})`
      } else if (roll < 0.68) {
        store.dispatch(
          api.util.upsertQueryEntries([
            { endpointName: 'get', arg, value: arg * 100 },
          ]),
        )
        step = `upsertQueryEntries(${arg})`
      } else if (roll < 0.72) {
        store.dispatch(
          api.internalActions.removeQueryResult({
            queryCacheKey: `get(${arg})` as QueryCacheKey,
          }),
        )
        step = `removeQueryResult(${arg})`
      } else if (roll < 0.74) {
        store.dispatch(api.util.resetApiState())
        handles = []
        step = 'resetApiState'
      } else {
        const ms = pick([0, 10, 30, 60, 250, 600, KEEP_UNUSED_MS + 50])
        await advance(ms)
        step = `advance(${ms})`
      }
      log.push(step)
      if (process.env.FUZZ_TRACE)
        process.stdout.write(`STEP ${s}/${i} ${step}\n`)
      // let promise callbacks and zero-delay timers run before checking
      // 1ms, not 0: a zero-delay timer created inside an earlier
      // `advanceTimersByTimeAsync` call does not run on `advance(0)`
      await advance(Number(process.env.FUZZ_FLUSH_MS ?? 1))
      check(
        fixture,
        `seq ${s} step ${i}: ${log.slice(process.env.FUZZ_DEBUG ? -15 : -4).join('\n -> ')}`,
        violations,
      )
    }
    store.dispatch(api.util.resetApiState())
    await advance(KEEP_UNUSED_MS * 2)
  }
  return violations
}

export function summarize(violations: Violation[]) {
  const byInvariant = new Map<string, { count: number; example: string }>()
  for (const v of violations) {
    const current = byInvariant.get(v.invariant)
    if (current) current.count++
    else
      byInvariant.set(v.invariant, {
        count: 1,
        example: `${v.key} @ ${v.step}`,
      })
  }
  return Object.fromEntries(byInvariant)
}

describe('runtime record fuzz', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test(`${SEQUENCES} x ${STEPS} random steps`, async () => {
    const violations = await runFuzz(SEED, SEQUENCES, STEPS, (ms) =>
      vi.advanceTimersByTimeAsync(ms),
    )
    const summary = summarize(violations)
    process.stdout.write(
      `fuzz ${violations.length} violations\n${JSON.stringify(summary, null, 2)}\n`,
    )
    // A request keeps running after `upsertQueryEntries` overwrites its
    // entry or `removeQueryResult` deletes it. `initiate` still treats it
    // as the running request until it settles.
    const known = [
      'registered request for fulfilled entry',
      'registered request for missing entry',
    ]
    expect(
      Object.keys(summary).filter((invariant) => !known.includes(invariant)),
    ).toEqual([])
  }, 600_000)
})
