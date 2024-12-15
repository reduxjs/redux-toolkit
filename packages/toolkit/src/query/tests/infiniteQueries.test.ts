import { configureStore, isAllOf } from '@reduxjs/toolkit'
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import util from 'util'
import type { InfiniteQueryActionCreatorResult } from '@reduxjs/toolkit/query/react'
import {
  QueryStatus,
  createApi,
  fetchBaseQuery,
  fakeBaseQuery,
  skipToken,
} from '@reduxjs/toolkit/query/react'
import {
  actionsReducer,
  setupApiStore,
  withProvider,
} from '../../tests/utils/helpers'
import type { BaseQueryApi } from '../baseQueryTypes'
import { server } from '@internal/query/tests/mocks/server'
import type { InfiniteQueryResultFlags } from '../core/buildSelectors'

describe('Infinite queries', () => {
  type Pokemon = {
    id: string
    name: string
  }

  let counters: Record<string, number> = {}

  const pokemonApi = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
    endpoints: (builder) => ({
      getInfinitePokemon: builder.infiniteQuery<Pokemon[], string, number>({
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
        query(pageParam) {
          return `https://example.com/listItems?page=${pageParam}`
        },
      }),
      getInfinitePokemonWithMax: builder.infiniteQuery<
        Pokemon[],
        string,
        number
      >({
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
        query(pageParam) {
          return `https://example.com/listItems?page=${pageParam}`
        },
      }),
      counters: builder.query<{ id: string; counter: number }, string>({
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

    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  test.only('Basic infinite query behavior', async () => {
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

  test.skip('does not break refetching query endpoints', async () => {
    const promise0 = storeRef.store.dispatch(
      pokemonApi.endpoints.counters.initiate('a'),
    )

    console.log('State after dispatch: ', storeRef.store.getState().api.queries)

    const res0 = await promise0

    console.log('State after promise: ', storeRef.store.getState().api.queries)
    console.log(storeRef.store.getState().actions)

    const promise1 = storeRef.store.dispatch(
      pokemonApi.util.upsertQueryData('counters', 'a', { id: 'a', counter: 1 }),
    )

    console.log('State after dispatch: ', storeRef.store.getState().api.queries)

    const res = await promise1

    console.log('State after promise: ', storeRef.store.getState().api.queries)
    console.log(storeRef.store.getState().actions)
  })

  test('does not have a page limit without maxPages', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await storeRef.store.dispatch(
        pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
          direction: 'forward',
        }),
      )

      if (res.status === QueryStatus.fulfilled) {
        expect(res.data.pages).toHaveLength(i)
      }
    }
  })

  test('applies a page limit with maxPages', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await storeRef.store.dispatch(
        pokemonApi.endpoints.getInfinitePokemonWithMax.initiate('fire', {
          direction: 'forward',
        }),
      )
      if (res.status === QueryStatus.fulfilled) {
        // Should have 1, 2, 3 (repeating) pages
        expect(res.data.pages).toHaveLength(Math.min(i, 3))
      }
    }

    // Should now have entries 7, 8, 9 after the loop

    const res = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemonWithMax.initiate('fire', {
        direction: 'backward',
      }),
    )

    if (res.status === QueryStatus.fulfilled) {
      // When we go back 1, we now have 6, 7, 8
      expect(res.data.pages).toEqual([
        [{ id: '6', name: 'Pokemon 6' }],
        [{ id: '7', name: 'Pokemon 7' }],
        [{ id: '8', name: 'Pokemon 8' }],
      ])
    }
  })

  test('validates maxPages during createApi call', async () => {
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
    let hitCounter = 0

    const countersApi = createApi({
      baseQuery: fakeBaseQuery(),
      endpoints: (build) => ({
        counters: build.infiniteQuery<
          { page: number; hitCounter: number },
          string,
          number
        >({
          queryFn(page) {
            hitCounter++

            return { data: { page, hitCounter } }
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
        }),
      }),
    })

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
    if (thirdRes.status === QueryStatus.fulfilled) {
      expect(thirdRes.data.pages).toEqual([
        { page: 3, hitCounter: 1 },
        { page: 4, hitCounter: 2 },
        { page: 5, hitCounter: 3 },
      ])
    }

    const fourthRes = await thirdPromise.refetch()

    if (fourthRes.status === QueryStatus.fulfilled) {
      // Refetching should call the query function again for each page
      expect(fourthRes.data.pages).toEqual([
        { page: 3, hitCounter: 4 },
        { page: 4, hitCounter: 5 },
        { page: 5, hitCounter: 6 },
      ])
    }
  })
})
