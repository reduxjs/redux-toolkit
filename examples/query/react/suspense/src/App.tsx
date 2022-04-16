import * as React from 'react'
import { POKEMON_NAMES } from './pokemon.data'
import './styles.css'
import { PokemonSingleQueries } from './PokemonSingleQueries'
import { PokemonParallelQueries } from './PokemonParallelQueries'

const getRandomPokemonName = () =>
  POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)]

export default function App() {
  const [errorRate, setErrorRate] = React.useState<number>(
    window.fetchFnErrorRate
  )

  React.useEffect(() => {
    window.fetchFnErrorRate = errorRate
  }, [errorRate])

  return (
    <div className="App">
      <div>
        <form action="#" className="global-controls">
          <label htmlFor="error-rate-input">
            fetch error rate: {errorRate}
            <input
              type="range"
              name="erro-rate"
              id="error-rate-input"
              min="0"
              max="1"
              step="0.1"
              value={errorRate}
              onChange={(evt) => {
                setErrorRate(Number(evt.currentTarget.value))
              }}
            />
          </label>
        </form>
      </div>
      <PokemonParallelQueries />
      <hr />
      <PokemonSingleQueries />
    </div>
  )
}
