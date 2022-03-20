import * as React from 'react'
import { pokemonApi } from './services/pokemon'
import type { PokemonName } from './pokemon.data'

const intervalOptions = [
  { label: 'Off', value: 0 },
  { label: '20s', value: 10000 },
  { label: '1m', value: 60000 },
]

const getRandomIntervalValue = () =>
  intervalOptions[Math.floor(Math.random() * intervalOptions.length)].value

export const Pokemon = ({
  name,
  suspendOnRefetch = false,
}: {
  name: PokemonName
  suspendOnRefetch?: boolean
}) => {
  const [pollingInterval, setPollingInterval] = React.useState(
    getRandomIntervalValue()
  )

  const { data, isFetching, refetch } =
    pokemonApi.endpoints.getPokemonByName.useUnstable_SuspenseQuery(name, {
      pollingInterval,
      suspendOnRefetch,
    })

  if (!data) {
    return (
      <section>
        <h3>{name}</h3>
        <p>No data!</p>
      </section>
    )
  }

  return (
    <section>
      <h3>{data.species.name}</h3>
      <div style={{ minWidth: 96, minHeight: 96 }}>
        <img
          src={data.sprites.front_shiny}
          alt={data.species.name}
          style={{ ...(isFetching ? { opacity: 0.3 } : {}) }}
        />
      </div>
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
        <p>suspendOnRefetch: {String(suspendOnRefetch)}</p>
        <button onClick={refetch} disabled={isFetching}>
          {isFetching ? 'Loading' : 'Manually refetch'}
        </button>
      </div>
    </section>
  )
}
