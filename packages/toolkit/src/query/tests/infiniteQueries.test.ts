import { server } from '@internal/query/tests/mocks/server'
import type { InfiniteQueryActionCreatorResult } from '@reduxjs/toolkit/query/react'
import {
  QueryStatus,
  createApi,
  fakeBaseQuery,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react'
import { HttpResponse, delay, http } from 'msw'
import { actionsReducer, setupApiStore } from '../../tests/utils/helpers'
import type { InfiniteQueryResultFlags } from '../core/buildSelectors'

describe('Infinite queries', () => {
  type Pokemon = {
    id: string
    name: string
  }

  let counters: Record<string, number> = {}
  let queryCounter = 0

  const pokemonApi = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
    endpoints: (build) => ({
      getInfinitePokemon: build.infiniteQuery<Pokemon[], string, number>({
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (
            lastPage,
            allPages,
            lastPageParam,
            allPageParams,
          ) => lastPageParam + 1,
          getPreviousPageParam: (
            firstPage,
            allPages,
            firstPageParam,
            allPageParams,
          ) => {
            return firstPageParam > 0 ? firstPageParam - 1 : undefined
          },
        },
        query({ pageParam }) {
          return `https://example.com/listItems?page=${pageParam}`
        },
      }),
      getInfinitePokemonWithMax: build.infiniteQuery<Pokemon[], string, number>(
        {
          infiniteQueryOptions: {
            initialPageParam: 0,
            maxPages: 3,
            getNextPageParam: (
              lastPage,
              allPages,
              lastPageParam,
              allPageParams,
            ) => lastPageParam + 1,
            getPreviousPageParam: (
              firstPage,
              allPages,
              firstPageParam,
              allPageParams,
            ) => {
              return firstPageParam > 0 ? firstPageParam - 1 : undefined
            },
          },
          query({ pageParam }) {
            return `https://example.com/listItems?page=${pageParam}`
          },
        },
      ),
      counters: build.query<{ id: string; counter: number }, string>({
        queryFn: async (arg) => {
          if (!(arg in counters)) {
            counters[arg] = 0
          }
          counters[arg]++

          return { data: { id: arg, counter: counters[arg] } }
        },
      }),
    }),
  })

  let hitCounter = 0

  type HitCounter = { page: number; hitCounter: number }

  const countersApi = createApi({
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Counter'],
    endpoints: (build) => ({
      counters: build.infiniteQuery<HitCounter, string, number>({
        queryFn({ pageParam }) {
          hitCounter++

          return { data: { page: pageParam, hitCounter } }
        },
        infiniteQueryOptions: {
          initialPageParam: 0,
          getNextPageParam: (
            lastPage,
            allPages,
            lastPageParam,
            allPageParams,
          ) => lastPageParam + 1,
        },
        providesTags: ['Counter'],
      }),
      mutation: build.mutation<null, void>({
        queryFn: async () => {
          return { data: null }
        },
        invalidatesTags: ['Counter'],
      }),
    }),
  })

  let storeRef = setupApiStore(
    pokemonApi,
    { ...actionsReducer },
    {
      withoutTestLifecycles: true,
    },
  )

  beforeEach(() => {
    server.use(
      http.get('https://example.com/listItems', ({ request }) => {
        const url = new URL(request.url)
        const pageString = url.searchParams.get('page')
        const pageNum = parseInt(pageString || '0')
        queryCounter++

        const results: Pokemon[] = [
          { id: `${pageNum}`, name: `Pokemon ${pageNum}` },
        ]
        return HttpResponse.json(results)
      }),
    )

    storeRef = setupApiStore(
      pokemonApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    counters = {}

    hitCounter = 0
    queryCounter = 0
  })

  type InfiniteQueryResult = Awaited<InfiniteQueryActionCreatorResult<any>>

  const checkResultData = (
    result: InfiniteQueryResult,
    expectedValues: Pokemon[][],
  ) => {
    expect(result.status).toBe(QueryStatus.fulfilled)
    if (result.status === QueryStatus.fulfilled) {
      expect(result.data.pages).toEqual(expectedValues)
    }
  }

  const checkResultLength = (
    result: InfiniteQueryResult,
    expectedLength: number,
  ) => {
    expect(result.status).toBe(QueryStatus.fulfilled)
    if (result.status === QueryStatus.fulfilled) {
      expect(result.data.pages).toHaveLength(expectedLength)
    }
  }

  test('Basic infinite query behavior', async () => {
    const checkFlags = (
      value: unknown,
      expectedFlags: Partial<InfiniteQueryResultFlags>,
    ) => {
      const actualFlags: InfiniteQueryResultFlags = {
        hasNextPage: false,
        hasPreviousPage: false,
        isFetchingNextPage: false,
        isFetchingPreviousPage: false,
        isFetchNextPageError: false,
        isFetchPreviousPageError: false,
        ...expectedFlags,
      }

      expect(value).toMatchObject(actualFlags)
    }

    const checkEntryFlags = (
      arg: string,
      expectedFlags: Partial<InfiniteQueryResultFlags>,
    ) => {
      const selector = pokemonApi.endpoints.getInfinitePokemon.select(arg)
      const entry = selector(storeRef.store.getState())

      checkFlags(entry, expectedFlags)
    }

    const res1 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    checkEntryFlags('fire', {})

    const entry1InitialLoad = await res1

    checkResultData(entry1InitialLoad, [[{ id: '0', name: 'Pokemon 0' }]])
    checkFlags(entry1InitialLoad, {
      hasNextPage: true,
    })

    const res2 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    checkEntryFlags('fire', {
      hasNextPage: true,
      isFetchingNextPage: true,
    })

    const entry1SecondPage = await res2

    checkResultData(entry1SecondPage, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
    ])
    checkFlags(entry1SecondPage, {
      hasNextPage: true,
    })

    const res3 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'backward',
      }),
    )

    checkEntryFlags('fire', {
      hasNextPage: true,
      isFetchingPreviousPage: true,
    })

    const entry1PrevPageMissing = await res3

    checkResultData(entry1PrevPageMissing, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
    ])
    checkFlags(entry1PrevPageMissing, {
      hasNextPage: true,
    })

    const res4 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('water', {
        initialPageParam: 3,
      }),
    )

    checkEntryFlags('water', {})

    const entry2InitialLoad = await res4

    checkResultData(entry2InitialLoad, [[{ id: '3', name: 'Pokemon 3' }]])
    checkFlags(entry2InitialLoad, {
      hasNextPage: true,
      hasPreviousPage: true,
    })

    const res5 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('water', {
        direction: 'forward',
      }),
    )

    checkEntryFlags('water', {
      hasNextPage: true,
      hasPreviousPage: true,
      isFetchingNextPage: true,
    })

    const entry2NextPage = await res5

    checkResultData(entry2NextPage, [
      [{ id: '3', name: 'Pokemon 3' }],
      [{ id: '4', name: 'Pokemon 4' }],
    ])
    checkFlags(entry2NextPage, {
      hasNextPage: true,
      hasPreviousPage: true,
    })

    const res6 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('water', {
        direction: 'backward',
      }),
    )

    checkEntryFlags('water', {
      hasNextPage: true,
      hasPreviousPage: true,
      isFetchingPreviousPage: true,
    })

    const entry2PrevPage = await res6

    checkResultData(entry2PrevPage, [
      [{ id: '2', name: 'Pokemon 2' }],
      [{ id: '3', name: 'Pokemon 3' }],
      [{ id: '4', name: 'Pokemon 4' }],
    ])
    checkFlags(entry2PrevPage, {
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  test('does not have a page limit without maxPages', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await storeRef.store.dispatch(
        pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
          direction: 'forward',
        }),
      )

      checkResultLength(res, i)
    }
  })

  test('applies a page limit with maxPages', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await storeRef.store.dispatch(
        pokemonApi.endpoints.getInfinitePokemonWithMax.initiate('fire', {
          direction: 'forward',
        }),
      )

      checkResultLength(res, Math.min(i, 3))
    }

    // Should now have entries 7, 8, 9 after the loop

    const res = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemonWithMax.initiate('fire', {
        direction: 'backward',
      }),
    )

    checkResultData(res, [
      [{ id: '6', name: 'Pokemon 6' }],
      [{ id: '7', name: 'Pokemon 7' }],
      [{ id: '8', name: 'Pokemon 8' }],
    ])
  })

  test('validates maxPages during createApi call', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const createApiWithMaxPages = (
      maxPages: number,
      getPreviousPageParam: (() => number) | undefined,
    ) => {
      createApi({
        baseQuery: fakeBaseQuery(),
        endpoints: (build) => ({
          getInfinitePokemon: build.infiniteQuery<Pokemon[], string, number>({
            query(pageParam) {
              return `https://example.com/listItems?page=${pageParam}`
            },
            infiniteQueryOptions: {
              initialPageParam: 0,
              maxPages,
              getNextPageParam: () => 1,
              getPreviousPageParam,
            },
          }),
        }),
      })
    }

    expect(() => createApiWithMaxPages(0, () => 0)).toThrowError(
      `maxPages for endpoint 'getInfinitePokemon' must be a number greater than 0`,
    )

    expect(() => createApiWithMaxPages(1, undefined)).toThrowError(
      `getPreviousPageParam for endpoint 'getInfinitePokemon' must be a function if maxPages is used`,
    )
  })

  test('refetches all existing pages', async () => {
    const checkResultData = (
      result: InfiniteQueryResult,
      expectedValues: HitCounter[],
    ) => {
      expect(result.status).toBe(QueryStatus.fulfilled)
      if (result.status === QueryStatus.fulfilled) {
        expect(result.data.pages).toEqual(expectedValues)
      }
    }

    const storeRef = setupApiStore(
      countersApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    await storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        initialPageParam: 3,
      }),
    )

    await storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        direction: 'forward',
      }),
    )

    const thirdPromise = storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        direction: 'forward',
      }),
    )

    const thirdRes = await thirdPromise

    checkResultData(thirdRes, [
      { page: 3, hitCounter: 1 },
      { page: 4, hitCounter: 2 },
      { page: 5, hitCounter: 3 },
    ])

    const fourthRes = await thirdPromise.refetch()

    checkResultData(fourthRes, [
      { page: 3, hitCounter: 4 },
      { page: 4, hitCounter: 5 },
      { page: 5, hitCounter: 6 },
    ])
  })

  test('Refetches on invalidation', async () => {
    const checkResultData = (
      result: InfiniteQueryResult,
      expectedValues: HitCounter[],
    ) => {
      expect(result.status).toBe(QueryStatus.fulfilled)
      if (result.status === QueryStatus.fulfilled) {
        expect(result.data.pages).toEqual(expectedValues)
      }
    }

    const storeRef = setupApiStore(
      countersApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    await storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        initialPageParam: 3,
      }),
    )

    await storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        direction: 'forward',
      }),
    )

    const thirdPromise = storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        direction: 'forward',
      }),
    )

    const thirdRes = await thirdPromise

    checkResultData(thirdRes, [
      { page: 3, hitCounter: 1 },
      { page: 4, hitCounter: 2 },
      { page: 5, hitCounter: 3 },
    ])

    await storeRef.store.dispatch(countersApi.endpoints.mutation.initiate())

    let entry = countersApi.endpoints.counters.select('item')(
      storeRef.store.getState(),
    )
    const promise = storeRef.store.dispatch(
      countersApi.util.getRunningQueryThunk('counters', 'item'),
    )
    const promises = storeRef.store.dispatch(
      countersApi.util.getRunningQueriesThunk(),
    )
    expect(entry).toMatchObject({
      status: 'pending',
    })

    expect(promise).toBeInstanceOf(Promise)

    expect(promises).toEqual([promise])

    const finalRes = await promise

    checkResultData(finalRes as any, [
      { page: 3, hitCounter: 4 },
      { page: 4, hitCounter: 5 },
      { page: 5, hitCounter: 6 },
    ])
  })

  test('Refetches on polling', async () => {
    const checkResultData = (
      result: InfiniteQueryResult,
      expectedValues: HitCounter[],
    ) => {
      expect(result.status).toBe(QueryStatus.fulfilled)
      if (result.status === QueryStatus.fulfilled) {
        expect(result.data.pages).toEqual(expectedValues)
      }
    }

    const storeRef = setupApiStore(
      countersApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    await storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        initialPageParam: 3,
      }),
    )

    await storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        direction: 'forward',
      }),
    )

    const thirdPromise = storeRef.store.dispatch(
      countersApi.endpoints.counters.initiate('item', {
        direction: 'forward',
      }),
    )

    const thirdRes = await thirdPromise

    checkResultData(thirdRes, [
      { page: 3, hitCounter: 1 },
      { page: 4, hitCounter: 2 },
      { page: 5, hitCounter: 3 },
    ])

    thirdPromise.updateSubscriptionOptions({
      pollingInterval: 50,
    })

    await delay(25)

    let entry = countersApi.endpoints.counters.select('item')(
      storeRef.store.getState(),
    )

    checkResultData(thirdRes, [
      { page: 3, hitCounter: 1 },
      { page: 4, hitCounter: 2 },
      { page: 5, hitCounter: 3 },
    ])

    await delay(50)

    entry = countersApi.endpoints.counters.select('item')(
      storeRef.store.getState(),
    )

    checkResultData(entry as any, [
      { page: 3, hitCounter: 4 },
      { page: 4, hitCounter: 5 },
      { page: 5, hitCounter: 6 },
    ])
  })

  test('Handles multiple next page fetches at once', async () => {
    const initialEntry = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    checkResultData(initialEntry, [[{ id: '0', name: 'Pokemon 0' }]])

    expect(queryCounter).toBe(1)

    const promise1 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    expect(queryCounter).toBe(1)

    const promise2 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    const entry1 = await promise1
    const entry2 = await promise2

    // The second thunk should have bailed out because the entry was now
    // pending, so we should only have sent one request.
    expect(queryCounter).toBe(2)

    expect(entry1).toEqual(entry2)

    checkResultData(entry1, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
    ])

    expect(queryCounter).toBe(2)

    const promise3 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    expect(queryCounter).toBe(2)

    // We can abort an existing promise, but due to timing issues,
    // we have to await the promise first before triggering the next request.
    promise3.abort()
    const entry3 = await promise3

    const promise4 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    const entry4 = await promise4

    expect(queryCounter).toBe(4)

    checkResultData(entry4, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
      [{ id: '2', name: 'Pokemon 2' }],
    ])
  })

  test('can fetch pages with refetchOnMountOrArgChange active', async () => {
    const pokemonApiWithRefetch = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
      endpoints: (build) => ({
        getInfinitePokemon: build.infiniteQuery<Pokemon[], string, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (
              lastPage,
              allPages,
              // Page param type should be `number`
              lastPageParam,
              allPageParams,
            ) => lastPageParam + 1,
            getPreviousPageParam: (
              firstPage,
              allPages,
              firstPageParam,
              allPageParams,
            ) => {
              return firstPageParam > 0 ? firstPageParam - 1 : undefined
            },
          },
          query({ pageParam }) {
            return `https://example.com/listItems?page=${pageParam}`
          },
        }),
      }),
      refetchOnMountOrArgChange: true,
    })

    const storeRef = setupApiStore(
      pokemonApiWithRefetch,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const res1 = storeRef.store.dispatch(
      pokemonApiWithRefetch.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    const entry1InitialLoad = await res1
    checkResultData(entry1InitialLoad, [[{ id: '0', name: 'Pokemon 0' }]])

    const res2 = storeRef.store.dispatch(
      pokemonApiWithRefetch.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    const entry1SecondPage = await res2
    checkResultData(entry1SecondPage, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
    ])

    expect(queryCounter).toBe(2)

    const entry2InitialLoad = await storeRef.store.dispatch(
      pokemonApiWithRefetch.endpoints.getInfinitePokemon.initiate('water', {}),
    )

    checkResultData(entry2InitialLoad, [[{ id: '0', name: 'Pokemon 0' }]])

    expect(queryCounter).toBe(3)

    const entry2SecondPage = await storeRef.store.dispatch(
      pokemonApiWithRefetch.endpoints.getInfinitePokemon.initiate('water', {
        direction: 'forward',
      }),
    )
    checkResultData(entry2SecondPage, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
    ])

    expect(queryCounter).toBe(4)

    // Should now be able to switch back to the first query.
    // The hooks dispatch on arg change without a direction.
    // That should trigger a refetch of the first query, meaning two requests.
    // It should also _replace_ the existing results, rather than appending
    // duplicate entries ([0, 1, 0, 1])
    const entry1Refetched = await storeRef.store.dispatch(
      pokemonApiWithRefetch.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    checkResultData(entry1Refetched, [
      [{ id: '0', name: 'Pokemon 0' }],
      [{ id: '1', name: 'Pokemon 1' }],
    ])

    expect(queryCounter).toBe(6)
  })

  test('Works with cache manipulation utils', async () => {
    const res1 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    const entry1InitialLoad = await res1
    checkResultData(entry1InitialLoad, [[{ id: '0', name: 'Pokemon 0' }]])

    storeRef.store.dispatch(
      pokemonApi.util.updateQueryData('getInfinitePokemon', 'fire', (draft) => {
        draft.pages.push([{ id: '1', name: 'Pokemon 1' }])
        draft.pageParams.push(1)
      }),
    )

    const selectFire = pokemonApi.endpoints.getInfinitePokemon.select('fire')
    const entry1Updated = selectFire(storeRef.store.getState())

    expect(entry1Updated.data).toEqual({
      pages: [
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ],
      pageParams: [0, 1],
    })

    const res2 = storeRef.store.dispatch(
      pokemonApi.util.upsertQueryData('getInfinitePokemon', 'water', {
        pages: [[{ id: '2', name: 'Pokemon 2' }]],
        pageParams: [2],
      }),
    )

    const entry2InitialLoad = await res2
    const selectWater = pokemonApi.endpoints.getInfinitePokemon.select('water')
    const entry2Updated = selectWater(storeRef.store.getState())

    expect(entry2Updated.data).toEqual({
      pages: [[{ id: '2', name: 'Pokemon 2' }]],
      pageParams: [2],
    })

    storeRef.store.dispatch(
      pokemonApi.util.upsertQueryEntries([
        {
          endpointName: 'getInfinitePokemon',
          arg: 'air',
          value: {
            pages: [[{ id: '3', name: 'Pokemon 3' }]],
            pageParams: [3],
          },
        },
      ]),
    )

    const selectAir = pokemonApi.endpoints.getInfinitePokemon.select('air')
    const entry3Initial = selectAir(storeRef.store.getState())

    expect(entry3Initial.data).toEqual({
      pages: [[{ id: '3', name: 'Pokemon 3' }]],
      pageParams: [3],
    })

    await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('air', {
        direction: 'forward',
      }),
    )

    const entry3Updated = selectAir(storeRef.store.getState())

    expect(entry3Updated.data).toEqual({
      pages: [
        [{ id: '3', name: 'Pokemon 3' }],
        [{ id: '4', name: 'Pokemon 4' }],
      ],
      pageParams: [3, 4],
    })
  })

  test('Cache lifecycle methods are called', async () => {
    const cacheEntryAddedCallback = vi.fn()
    const queryStartedCallback = vi.fn()

    const pokemonApi = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
      endpoints: (build) => ({
        getInfinitePokemonWithLifecycles: build.infiniteQuery<
          Pokemon[],
          string,
          number
        >({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (
              lastPage,
              allPages,
              // Page param type should be `number`
              lastPageParam,
              allPageParams,
            ) => lastPageParam + 1,
            getPreviousPageParam: (
              firstPage,
              allPages,
              firstPageParam,
              allPageParams,
            ) => {
              return firstPageParam > 0 ? firstPageParam - 1 : undefined
            },
          },
          query({ pageParam }) {
            return `https://example.com/listItems?page=${pageParam}`
          },
          async onCacheEntryAdded(arg, api) {
            const data = await api.cacheDataLoaded
            cacheEntryAddedCallback(arg, data)
          },
          async onQueryStarted(arg, api) {
            const data = await api.queryFulfilled
            queryStartedCallback(arg, data)
          },
        }),
      }),
    })

    const storeRef = setupApiStore(
      pokemonApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const res1 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemonWithLifecycles.initiate(
        'fire',
        {},
      ),
    )

    const entry1InitialLoad = await res1
    checkResultData(entry1InitialLoad, [[{ id: '0', name: 'Pokemon 0' }]])

    expect(cacheEntryAddedCallback).toHaveBeenCalledWith('fire', {
      data: {
        pages: [[{ id: '0', name: 'Pokemon 0' }]],
        pageParams: [0],
      },
      meta: undefined,
    })

    expect(queryStartedCallback).toHaveBeenCalledWith('fire', {
      data: {
        pages: [[{ id: '0', name: 'Pokemon 0' }]],
        pageParams: [0],
      },
      meta: undefined,
    })
  })

  test('Can use transformResponse', async () => {
    type PokemonPage = { items: Pokemon[]; page: number }
    const pokemonApi = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
      endpoints: (build) => ({
        getInfinitePokemonWithTransform: build.infiniteQuery<
          PokemonPage,
          string,
          number
        >({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (
              lastPage,
              allPages,
              // Page param type should be `number`
              lastPageParam,
              allPageParams,
            ) => lastPageParam + 1,
          },
          query({ pageParam }) {
            return `https://example.com/listItems?page=${pageParam}`
          },
          transformResponse(baseQueryReturnValue: Pokemon[], meta, arg) {
            expect(Array.isArray(baseQueryReturnValue)).toBe(true)
            return {
              items: baseQueryReturnValue,
              page: arg.pageParam,
            }
          },
        }),
      }),
    })

    const storeRef = setupApiStore(
      pokemonApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    const checkResultData = (
      result: InfiniteQueryResult,
      expectedValues: PokemonPage[],
    ) => {
      expect(result.status).toBe(QueryStatus.fulfilled)
      if (result.status === QueryStatus.fulfilled) {
        expect(result.data.pages).toEqual(expectedValues)
      }
    }

    const res1 = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemonWithTransform.initiate('fire', {}),
    )

    const entry1InitialLoad = await res1
    checkResultData(entry1InitialLoad, [
      { items: [{ id: '0', name: 'Pokemon 0' }], page: 0 },
    ])

    const entry1Updated = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemonWithTransform.initiate('fire', {
        direction: 'forward',
      }),
    )

    checkResultData(entry1Updated, [
      { items: [{ id: '0', name: 'Pokemon 0' }], page: 0 },
      { items: [{ id: '1', name: 'Pokemon 1' }], page: 1 },
    ])
  })
})
