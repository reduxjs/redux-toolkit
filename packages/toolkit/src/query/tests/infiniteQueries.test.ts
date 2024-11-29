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

describe('Infinite queries', () => {
  type Pokemon = {
    id: string
    name: string
  }

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
      counter: builder.query<number, string>({
        queryFn: async () => {
          return { data: 0 }
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
    storeRef = setupApiStore(
      pokemonApi,
      { ...actionsReducer },
      {
        withoutTestLifecycles: true,
      },
    )

    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  test('Basic infinite query behavior', async () => {
    const res1 = storeRef.store.dispatch(
      // Should be `arg: string`
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    const entry1InitialLoad = await res1
    expect(entry1InitialLoad.status).toBe(QueryStatus.fulfilled)
    // console.log('Value: ', util.inspect(entry1InitialLoad, { depth: Infinity }))

    if (entry1InitialLoad.status === QueryStatus.fulfilled) {
      expect(entry1InitialLoad.data.pages).toEqual([
        // one page, one entry
        [{ id: '0', name: 'Pokemon 0' }],
      ])
    }

    const entry1SecondPage = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )

    expect(entry1SecondPage.status).toBe(QueryStatus.fulfilled)
    if (entry1SecondPage.status === QueryStatus.fulfilled) {
      expect(entry1SecondPage.data.pages).toEqual([
        // two pages, one entry each
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ])
    }

    const entry1PrevPageMissing = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'backward',
      }),
    )

    if (entry1PrevPageMissing.status === QueryStatus.fulfilled) {
      expect(entry1PrevPageMissing.data.pages).toEqual([
        // two pages, one entry each
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ])
    }

    const entry2InitialLoad = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('water', {
        initialPageParam: 3,
      }),
    )

    if (entry2InitialLoad.status === QueryStatus.fulfilled) {
      expect(entry2InitialLoad.data.pages).toEqual([
        // one page, one entry
        [{ id: '3', name: 'Pokemon 3' }],
      ])
    }

    const entry2NextPage = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('water', {
        direction: 'forward',
      }),
    )

    if (entry2NextPage.status === QueryStatus.fulfilled) {
      expect(entry2NextPage.data.pages).toEqual([
        // two pages, one entry each
        [{ id: '3', name: 'Pokemon 3' }],
        [{ id: '4', name: 'Pokemon 4' }],
      ])
    }

    const entry2PrevPage = await storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('water', {
        direction: 'backward',
      }),
    )

    if (entry2PrevPage.status === QueryStatus.fulfilled) {
      expect(entry2PrevPage.data.pages).toEqual([
        // three pages, one entry each
        [{ id: '2', name: 'Pokemon 2' }],
        [{ id: '3', name: 'Pokemon 3' }],
        [{ id: '4', name: 'Pokemon 4' }],
      ])
    }
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
})
