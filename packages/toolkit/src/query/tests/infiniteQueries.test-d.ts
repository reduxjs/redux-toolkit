import type { skipToken, InfiniteData } from '@reduxjs/toolkit/query/react'
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
      endpoints: (build) => ({
        getInfinitePokemon: build.infiniteQuery<Pokemon[], string, number>({
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
          query({ pageParam, queryArg }) {
            expectTypeOf(pageParam).toBeNumber()
            expectTypeOf(queryArg).toBeString()

            return `https://example.com/listItems?page=${pageParam}`
          },
          async onCacheEntryAdded(arg, api) {
            const data = await api.cacheDataLoaded
            expectTypeOf(data.data).toEqualTypeOf<
              InfiniteData<Pokemon[], number>
            >()
          },
          async onQueryStarted(arg, api) {
            const data = await api.queryFulfilled
            expectTypeOf(data.data).toEqualTypeOf<
              InfiniteData<Pokemon[], number>
            >()
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

    expectTypeOf(pokemonApi.useGetInfinitePokemonInfiniteQuery).toBeFunction()

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

    const useGetInfinitePokemonQuery =
      pokemonApi.endpoints.getInfinitePokemon.useInfiniteQuery

    expectTypeOf(useGetInfinitePokemonQuery)
      .parameter(0)
      .toEqualTypeOf<string | typeof skipToken>()

    function PokemonList() {
      const {
        data,
        currentData,
        isFetching,
        isUninitialized,
        isSuccess,
        fetchNextPage,
      } = useGetInfinitePokemonQuery('a')

      expectTypeOf(data).toEqualTypeOf<
        InfiniteData<Pokemon[], number> | undefined
      >()

      if (isSuccess) {
        expectTypeOf(data.pages).toEqualTypeOf<Pokemon[][]>()
        expectTypeOf(data.pageParams).toEqualTypeOf<number[]>()
      }

      if (currentData) {
        expectTypeOf(currentData.pages).toEqualTypeOf<Pokemon[][]>()
        expectTypeOf(currentData.pageParams).toEqualTypeOf<number[]>()
      }

      const handleClick = async () => {
        const res = await fetchNextPage()

        if (res.status === QueryStatus.fulfilled) {
          expectTypeOf(res.data.pages).toEqualTypeOf<Pokemon[][]>()
          expectTypeOf(res.data.pageParams).toEqualTypeOf<number[]>()
        }
      }
    }
  })
})
