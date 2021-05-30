import { useGetPokemonByNameQuery } from './services/pokemon'

export const Pokemon = ({ name }: { name: string }) => {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetPokemonByNameQuery(name)

  return (
    <div style={{ float: 'left', textAlign: 'center' }}>
      {error ? (
        <>Oh no, there was an error</>
      ) : isLoading ? (
        <>Loading...</>
      ) : data ? (
        <>
          <h3>{data.species.name}</h3>
          <div>
            <img src={data.sprites.front_shiny} alt={data.species.name} />
          </div>
          <div>
            <button onClick={refetch} disabled={isFetching}>
              {isFetching ? 'Fetching...' : 'Refetch'}
            </button>
          </div>
        </>
      ) : (
        'No Data'
      )}
    </div>
  )
}
