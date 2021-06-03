import * as React from 'react'
import { Pokemon } from './Pokemon'

export default function App() {
  const [pokemon, setPokemon] = React.useState<string[]>(['bulbasaur'])

  React.useEffect(() => {
    // Add a duplicate of bulbasaur - notice there is no second request?
    setTimeout(() => {
      setPokemon((prev) => [...prev, 'bulbasaur'])
    }, 1500)

    // Add a pokemon that doesn't exist in the cache, will generate a network request
    setTimeout(() => {
      setPokemon((prev) => [...prev, 'pikachu'])
    }, 2000)
  }, [])

  return (
    <div className="App">
      <div>
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
