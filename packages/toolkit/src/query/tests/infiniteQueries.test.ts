import { configureStore, isAllOf } from '@reduxjs/toolkit'
import { renderHook, waitFor } from '@testing-library/react'
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
  beforeEach(() => {
    server.resetHandlers()
  })

  test('Basic infinite query behavior', async () => {
    type Pokemon = {
      id: string
      name: string
    }

    type PokemonQueryArg = {
      type: string
      page: number
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
            getNextPageParam: (
              lastPage,
              allPages,
              // ✅Currently: page param type is `number`
              lastPageParam,
              allPageParams,
            ) => lastPageParam + 1,
          },
          // ❌ This seems to be controlled by `BaseEndpointDefinition`
          // GOAL: should be `pageParam: number`
          query(pageParam) {
            return `https://example.com/listItems?page=${pageParam}`
          },
        }),
      }),
    })

    const storeRef = setupApiStore(pokemonApi, undefined, {
      withoutTestLifecycles: true,
    })

    const res = storeRef.store.dispatch(
      // ❌ This seems to be controlled by `BaseEndpointDefinition`.
      // GOAL: should be `arg: string`
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    const firstResult = await res
    expect(firstResult.status).toBe(QueryStatus.fulfilled)
    console.log('Value: ', util.inspect(firstResult, { depth: Infinity }))

    if (firstResult.status === QueryStatus.fulfilled) {
      expect(firstResult.data.pages).toEqual([
        // one page, one entry
        [{ id: '0', name: 'Pokemon 0' }],
      ])
    }

    const secondRes = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
        data: firstResult.data,
      }),
    )

    const secondResult = await secondRes
    expect(secondResult.status).toBe(QueryStatus.fulfilled)
    console.log('Value: ', util.inspect(secondResult, { depth: Infinity }))
    if (secondResult.status === QueryStatus.fulfilled) {
      expect(secondResult.data.pages).toEqual([
        // two pages, one entry each
        [{ id: '0', name: 'Pokemon 0' }],
        [{ id: '1', name: 'Pokemon 1' }],
      ])
    }

    console.log(
      'API state: ',
      util.inspect(storeRef.store.getState().api, { depth: Infinity }),
    )
  })
})
