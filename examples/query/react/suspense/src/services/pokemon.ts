import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { PokemonName } from '../pokemon.data'

export const pokemonApi = createApi({
  reducerPath: 'pokemonApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://pokeapi.co/api/v2/',
    fetchFn(
      ...args: Parameters<typeof window.fetch>
    ): ReturnType<typeof window.fetch> {
      const errorRate = Math.max(Number(window.fetchFnErrorRate ?? 0), 0)

      if (Number.isFinite(errorRate) && Math.random() <= errorRate) {
        return Promise.reject(
          new Error(`fetch errorRate ${window.fetchFnErrorRate}`)
        )
      }

      return fetch(...args)
    },
  }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query<Record<string, any>, PokemonName>({
      query: (name: PokemonName) => `pokemon/${name}`,
    }),
  }),
})

const { useGetPokemonByNameQuery } = pokemonApi

export { useGetPokemonByNameQuery }
