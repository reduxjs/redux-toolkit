import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { TestContext } from 'vitest'
import { expect, test } from 'vitest'

const devChecksOff = {
  serializableCheck: false,
  immutableCheck: false,
  actionCreatorCheck: false,
} as const

function makeApi() {
  return createApi({
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Item'],
    endpoints: (build) => ({
      getItem: build.query<{ id: number }, number>({
        queryFn: (id) => ({ data: { id } }),
        providesTags: (_result, _error, id) => [{ type: 'Item', id }],
      }),
    }),
  })
}

// Every entry keeps one subscription, so each key has a live record.
async function makeSubscribedStore(cacheEntries: number) {
  const api = makeApi()
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM(devChecksOff).concat(api.middleware),
  })
  store.dispatch(
    api.util.upsertQueryEntries(
      Array.from({ length: cacheEntries }, (_, i) => ({
        endpointName: 'getItem' as const,
        arg: i,
        value: { id: i },
      })),
    ),
  )
  const subs = []
  for (let i = 0; i < cacheEntries; i++) {
    subs.push(store.dispatch(api.endpoints.getItem.initiate(i)))
  }
  await Promise.all(subs)
  return { api, store, subs }
}

async function compareCases(
  bench: TestContext['bench'],
  group: string,
  cases: Record<string, () => void>,
) {
  const { BENCH_SAVE, BENCH_BASELINE } = process.env
  const registrations = []
  for (const [name, fn] of Object.entries(cases)) {
    const file = `${slugify(group)}/${slugify(name)}.json`
    registrations.push(
      bench(
        name,
        BENCH_SAVE
          ? { writeResult: `bench/results/${BENCH_SAVE}/${file}` }
          : {},
        fn,
      ),
    )
    if (BENCH_BASELINE) {
      registrations.push(
        bench.from(
          `${name} [${BENCH_BASELINE}]`,
          `bench/results/${BENCH_BASELINE}/${file}`,
        ),
      )
    }
  }
  await bench.compare(...registrations)
}

function slugify(name: string) {
  return name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}

for (const size of [1000, 10000]) {
  test(`subscription lifecycle with ${size} subscribed keys`, async ({
    bench,
  }) => {
    const { api, store } = await makeSubscribedStore(size)
    let n = 0
    await compareCases(bench, `subscription lifecycle ${size}`, {
      'subscribe + unsubscribe a cached key': () => {
        const sub = store.dispatch(api.endpoints.getItem.initiate(n++ % size))
        sub.unsubscribe()
      },
      'updateSubscriptionOptions': () => {
        const sub = store.dispatch(api.endpoints.getItem.initiate(n++ % size))
        sub.updateSubscriptionOptions({ pollingInterval: 0 })
        sub.unsubscribe()
      },
      'unrelated action': () => {
        store.dispatch({ type: 'some/unrelated' })
      },
    })
    expect(n).toBeGreaterThan(0)
  }, 600_000)
}
