import {
  createApi,
  fetchBaseQuery,
  QueryStatus,
} from '@reduxjs/toolkit/query/react'
import { setupApiStore } from '../../tests/utils/helpers'

describe('Infinite queries', () => {
  test('Basic infinite query behavior', async () => {
    type Pokemon = {
      id: string
      name: string
    }

    const pokemonApi = createApi({
      baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
      endpoints: (builder) => ({
        getInfinitePokemon: builder.infiniteQuery<Pokemon[], string, number>({
          infiniteQueryOptions: {
            initialPageParam: 0,
            getNextPageParam: (
              lastPage,
              allPages,
              lastPageParam,
              allPageParams,
            ) => {
              expectTypeOf(lastPage).toEqualTypeOf<Pokemon[]>()

              expectTypeOf(allPages).toEqualTypeOf<Pokemon[][]>()

              expectTypeOf(lastPageParam).toBeNumber()

              expectTypeOf(allPageParams).toEqualTypeOf<number[]>()

              return lastPageParam + 1
            },
          },
          query(pageParam) {
            expectTypeOf(pageParam).toBeNumber()

            return `https://example.com/listItems?page=${pageParam}`
          },
        }),
      }),
    })

    const storeRef = setupApiStore(pokemonApi, undefined, {
      withoutTestLifecycles: true,
    })

    expectTypeOf(pokemonApi.endpoints.getInfinitePokemon.initiate)
      .parameter(0)
      .toBeString()

    const res = storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {}),
    )

    const firstResult = await res

    if (firstResult.status === QueryStatus.fulfilled) {
      expectTypeOf(firstResult.data.pages).toEqualTypeOf<Pokemon[][]>()
      expectTypeOf(firstResult.data.pageParams).toEqualTypeOf<number[]>()
    }

    storeRef.store.dispatch(
      pokemonApi.endpoints.getInfinitePokemon.initiate('fire', {
        direction: 'forward',
      }),
    )
  })
})
