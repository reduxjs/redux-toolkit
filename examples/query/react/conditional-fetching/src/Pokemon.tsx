import * as React from 'react'
import { useGetPokemonByNameQuery } from './services/pokemon'
import type { PokemonName } from './pokemon.data'

export const Pokemon = ({ name }: { name: PokemonName }) => {
  const [skip, setSkip] = React.useState(true)
  const { data, error, isLoading, isUninitialized } = useGetPokemonByNameQuery(
    name,
    {
      skip,
    }
  )

  const SkipToggle = () => (
    <button onClick={() => setSkip((prev) => !prev)}>
      Toggle Skip ({String(skip)})
    </button>
  )

  return (
    <>
      {error ? (
        <>Oh no, there was an error</>
      ) : isUninitialized ? (
        <div>
          {name} - Currently skipped - <SkipToggle />
        </div>
      ) : isLoading ? (
        <>loading...</>
      ) : data ? (
        <>
          <div>
            <h3>{data.species.name}</h3>
            <img src={data.sprites.front_shiny} alt={data.species.name} />
          </div>
          <SkipToggle />
        </>
      ) : null}
    </>
  )
}
