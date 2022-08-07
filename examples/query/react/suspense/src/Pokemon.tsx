import * as React from 'react'
import { useSuspendAll } from '@reduxjs/toolkit/query/react'
import { useGetPokemonByNameQuery } from './services/pokemon'
import type { PokemonName } from './pokemon.data'

const intervalOptions = [
  { label: 'Off', value: 0 },
  { label: '20s', value: 10000 },
  { label: '1m', value: 60000 },
]

const getRandomIntervalValue = () =>
  intervalOptions[Math.floor(Math.random() * intervalOptions.length)].value

export interface PokemonProps {
  name: PokemonName
}

export function Pokemon({ name }: PokemonProps) {
  const [pollingInterval, setPollingInterval] = React.useState(
    getRandomIntervalValue()
  )

  const [{ data, isFetching, refetch }] = useSuspendAll(
    useGetPokemonByNameQuery(name)
  )

  return (
    <section className="pokemon-card">
      <h3>{data.species.name}</h3>
      <img
        src={data.sprites.front_shiny}
        alt={data.species.name}
        className={'pokemon-card__pic'}
        style={{ ...(isFetching ? { opacity: 0.3 } : {}) }}
      />
      <div>
        <label style={{ display: 'block' }}>Polling interval</label>
        <select
          value={pollingInterval}
          onChange={({ target: { value } }) =>
            setPollingInterval(Number(value))
          }
        >
          {intervalOptions.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
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
}
