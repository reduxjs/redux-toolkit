import './styles.css'
import { Pokemon } from './Pokemon'
import { useState } from 'react'

const pokemon = ['bulbasaur', 'pikachu', 'ditto', 'bulbasaur']

export default function App() {
  const [pollingInterval, setPollingInterval] = useState(0)

  return (
    <div className="App">
      <select
        onChange={(change) => setPollingInterval(Number(change.target.value))}
      >
        <option value={0}>Off</option>
        <option value={1000}>1s</option>
        <option value={5000}>5s</option>
      </select>
      <div>
        {pokemon.map((poke, index) => (
          <Pokemon key={index} name={poke} pollingInterval={pollingInterval} />
        ))}
      </div>
    </div>
  )
}
