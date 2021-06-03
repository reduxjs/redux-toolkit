import './styles.css'
import { useGetPokemonByNameQuery } from './services/pokemon'

export default function App() {
  const { data, error, isLoading } = useGetPokemonByNameQuery('bulbasaur')

  return (
    <div className="App">
      {error ? (
        <>Oh no, there was an error</>
      ) : isLoading ? (
        <>Loading...</>
      ) : data ? (
        <>
          <h3>{data.species.name}</h3>
          <img src={data.sprites.front_shiny} alt={data.species.name} />
        </>
      ) : null}
    </div>
  )
}
