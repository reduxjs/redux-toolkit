import {
  createApi,
  fetchBaseQuery,
  ApiProvider,
} from '@reduxjs/toolkit/query/react'

const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://pokeapi.co/api/v2' }),
  endpoints: (builder) => ({
    getPokemonByName: builder.query({
      query: (name: string) => `pokemon/${name}`,
    }),
  }),
})

function Pokemon() {
  const { data, refetch, isFetching } = api.useGetPokemonByNameQuery(
    'bulbasaur'
  )

  return (
    <div>
      <button onClick={refetch}>Refetch</button>
      <div>
        <b>isFetching?</b>: {String(isFetching)}
      </div>
      <hr />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}

export default function App() {
  return (
    <ApiProvider api={api}>
      <Pokemon />
    </ApiProvider>
  )
}
