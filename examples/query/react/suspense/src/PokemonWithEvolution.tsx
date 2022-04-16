import * as React from 'react'
import { PokemonName } from './pokemon.data'
import { useGetPokemonByNameQuery } from './services/pokemon'
import { useSuspendAll } from '@reduxjs/toolkit/query/react'

export interface PokemonWithEvolutionProps {
  base: PokemonName
  evolution: PokemonName
}

export function PokemonWithEvolution({
  base,
  evolution,
}: PokemonWithEvolutionProps) {
  const [baseDataQuery, evolutionQuery] = useSuspendAll(
    useGetPokemonByNameQuery(base),
    useGetPokemonByNameQuery(evolution)
  )

  return (
    <>
      {[baseDataQuery, evolutionQuery].map(
        ({ data, isFetching, refetch }, idx) => (
          <section className="pokemon-card" key={idx}>
            <h3>{data.species.name}</h3>
            <img
              src={data.sprites.front_shiny}
              alt={data.species.name}
              className={'pokemon-card__pic'}
              style={{ ...(isFetching ? { opacity: 0.3 } : {}) }}
            />
            <div>{idx === 0 ? 'base' : 'evolution'}</div>
            <div>
              <button
                type="button"
                className={'btn'}
                onClick={refetch}
                disabled={isFetching}
              >
                {isFetching ? 'Loading' : 'Manually refetch'}
              </button>
            </div>
          </section>
        )
      )}
    </>
  )
}
