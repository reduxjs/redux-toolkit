import * as React from 'react'
import './styles.css'
import { Pokemon } from './Pokemon'
import { POKEMON_NAMES } from './pokemon.data'

const getRandomPokemonName = () =>
  POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)]

export default function App() {
  const [pokemon, setPokemon] = React.useState<string[]>(['bulbasaur'])

  return (
    <div className="App">
      <div>
        <button
          onClick={() =>
            setPokemon((prev) => [...prev, getRandomPokemonName()])
          }
        >
          Add random pokemon
        </button>
        <button onClick={() => setPokemon((prev) => [...prev, 'bulbasaur'])}>
          Add bulbasaur
        </button>
      </div>

      {pokemon.map((name, index) => (
        <Pokemon key={index} name={name} />
      ))}
    </div>
  )
}
