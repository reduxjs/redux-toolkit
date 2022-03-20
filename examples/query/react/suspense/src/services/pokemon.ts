import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { PokemonName } from '../pokemon.data'

export const pokemonApi = createApi({
  reducerPath: 'pokemonApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2/' }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query({
      query: (name: PokemonName) => `pokemon/${name}`,
    }),
  }),
})
