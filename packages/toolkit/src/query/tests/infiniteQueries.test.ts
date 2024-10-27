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
      // GOAL: Specify both the query arg (for cache key serialization)
      // and the page param type (for feeding into the query URL)
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

        // Actual query arg type should be `number`
        query(pageParam) {
          return `https://example.com/listItems?page=${pageParam}`
        },
      }),
    }),
  })

  let storeRef = setupApiStore(pokemonApi, undefined, {
    withoutTestLifecycles: true,
  })

  beforeEach(() => {
    storeRef = setupApiStore(pokemonApi, undefined, {
      withoutTestLifecycles: true,
    })
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
    // console.log('Value: ', util.inspect(entry1SecondPage, { depth: Infinity }))
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
      // There is no p
      expect(entry1PrevPageMissing.data.pages).toEqual([
        // two pages, one entry each
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ])
    }

    // console.log(
    //   'API state: ',
    //   util.inspect(storeRef.store.getState().api, { depth: Infinity }),
    // )

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
})
