import React, { useState } from 'react'
import { useGetPokemonByNameQuery } from './services/pokemon'

export const Pokemon = ({ name }: { name: string }) => {
  const [skip, setSkip] = useState(true)
  const { data, error, isLoading, isUninitialized } = useGetPokemonByNameQuery(
    name,
    {
      skip,
    }
  )

  const SkipButton = () => (
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
          {name} - Currently skipped - <SkipButton />
        </div>
      ) : isLoading ? (
        <>loading...</>
      ) : data ? (
        <>
          <div>
            <h3>{data.species.name}</h3>
            <img src={data.sprites.front_shiny} alt={data.species.name} />
          </div>
          <SkipButton />
        </>
      ) : null}
    </>
  )
}
