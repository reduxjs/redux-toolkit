import type { Middleware, UnknownAction } from '@reduxjs/toolkit'
import {
  combineReducers,
  configureStore,
  createAction,
  createListenerMiddleware,
  createSlice,
  Tuple,
} from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { TestContext } from 'vitest'
import { expect, test } from 'vitest'

const unrelated = { type: 'some/unrelated', payload: 1 }

const devChecksOff = {
  serializableCheck: false,
  immutableCheck: false,
  actionCreatorCheck: false,
} as const

function makeSlice(name: string) {
  return createSlice({
    name,
    initialState: { value: 0, items: [] as number[] },
    reducers: {
      increment: (state) => {
        state.value += 1
      },
      decrement: (state) => {
        state.value -= 1
      },
      set: (state, action: { payload: number }) => {
        state.value = action.payload
      },
      add: (state, action: { payload: number }) => {
        state.items.push(action.payload)
      },
      reset: () => ({ value: 0, items: [] }),
    },
  })
}

function makeSliceStore(sliceCount: number) {
  const reducers: Record<string, ReturnType<typeof makeSlice>['reducer']> = {}
  for (let i = 0; i < sliceCount; i++) {
    reducers[`slice${i}`] = makeSlice(`slice${i}`).reducer
  }
  return configureStore({
    reducer: combineReducers(reducers),
    middleware: () => new Tuple(),
  })
}

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

// `recordFulfilled` adds a middleware that captures the last `getItem`
// fulfilled action. It runs on every dispatch, so only enable it for stores
// whose benchmarks all share it.
async function makeApiStore(cacheEntries: number, recordFulfilled = false) {
  const api = makeApi()
  let lastFulfilled: UnknownAction | undefined
  const recorder: Middleware = () => (next) => (action) => {
    if (api.endpoints.getItem.matchFulfilled(action)) {
      lastFulfilled = action
    }
    return next(action)
  }
  const store = configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      other: (state: number = 0) => state,
    },
    middleware: (gDM) =>
      recordFulfilled
        ? gDM(devChecksOff).concat(api.middleware, recorder)
        : gDM(devChecksOff).concat(api.middleware),
  })
  for (let i = 0; i < cacheEntries; i++) {
    await store.dispatch(api.endpoints.getItem.initiate(i))
  }
  return { api, store, lastFulfilled }
}

function makeListenerStore(listenerCount: number | undefined) {
  const middleware: Middleware[] = []
  if (listenerCount !== undefined) {
    const listener = createListenerMiddleware()
    for (let i = 0; i < listenerCount; i++) {
      listener.startListening({
        actionCreator: createAction(`feature${i}/thing`),
        effect: () => {},
      })
    }
    middleware.push(listener.middleware)
  }
  return configureStore({
    reducer: (state: number = 0) => state,
    middleware: () => new Tuple(...middleware),
  })
}

// `BENCH_SAVE=<label>` writes each result to `bench/results/<label>/`.
// `BENCH_BASELINE=<label>` adds the saved `<label>` results as extra rows.
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

test('createAction.match (x1000 per iteration)', async ({ bench }) => {
  const thing = createAction<number>('feature/thing')
  const matching = thing(1)
  const REPEAT = 1000
  let hits = 0

  await compareCases(bench, 'createAction.match', {
    'match, non-matching action': () => {
      for (let i = 0; i < REPEAT; i++) {
        if (thing.match(unrelated)) hits++
      }
    },
    'match, matching action': () => {
      for (let i = 0; i < REPEAT; i++) {
        if (thing.match(matching)) hits++
      }
    },
  })
  expect(hits).toBeGreaterThan(0)
})

test('unrelated action through createSlice reducers', async ({ bench }) => {
  const plain = configureStore({
    reducer: combineReducers({ a: (state: number = 0) => state }),
    middleware: () => new Tuple(),
  })
  const one = makeSliceStore(1)
  const twenty = makeSliceStore(20)

  await compareCases(bench, 'createSlice reducers', {
    'plain reducer': () => plain.dispatch(unrelated),
    '1 slice': () => one.dispatch(unrelated),
    '20 slices': () => twenty.dispatch(unrelated),
  })
})

test('unrelated action through a store with an RTKQ api', async ({ bench }) => {
  const withoutApi = configureStore({
    reducer: { other: (state: number = 0) => state },
    middleware: (gDM) => gDM(devChecksOff),
  })
  const empty = await makeApiStore(0)
  const hundred = await makeApiStore(100)
  const thousand = await makeApiStore(1000)

  await compareCases(bench, 'rtkq unrelated action', {
    'no api': () => withoutApi.dispatch(unrelated),
    'api, 0 cache entries': () => empty.store.dispatch(unrelated),
    'api, 100 cache entries': () => hundred.store.dispatch(unrelated),
    'api, 1000 cache entries': () => thousand.store.dispatch(unrelated),
  })
})

test('RTKQ actions that touch provided tags (1000 cache entries)', async ({
  bench,
}) => {
  const { api, store, lastFulfilled } = await makeApiStore(1000, true)
  if (!lastFulfilled) throw new Error('no fulfilled action recorded')

  await compareCases(bench, 'rtkq provided tags', {
    'unrelated action': () => store.dispatch(unrelated),
    'invalidateTags([])': () => store.dispatch(api.util.invalidateTags([])),
    're-dispatch fulfilled action (same tags)': () =>
      store.dispatch(lastFulfilled),
  })
})

test('unrelated action through listener middleware', async ({ bench }) => {
  const none = makeListenerStore(undefined)
  const zero = makeListenerStore(0)
  const ten = makeListenerStore(10)
  const twoHundred = makeListenerStore(200)

  await compareCases(bench, 'listener middleware', {
    'no listener middleware': () => none.dispatch(unrelated),
    '0 listeners': () => zero.dispatch(unrelated),
    '10 listeners': () => ten.dispatch(unrelated),
    '200 listeners': () => twoHundred.dispatch(unrelated),
  })
})
