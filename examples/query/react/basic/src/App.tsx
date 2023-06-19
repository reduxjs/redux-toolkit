import './styles.css'
import { pokemonApi } from './services/pokemon'
import React, { useState, use, version } from 'react'
const { useSuspenseQuery } = pokemonApi.endpoints.getPokemonByName

console.log(version)

declare module 'react' {
  export function use<T>(p: Promise<T>): T
}

export default function App() {
  console.log('render')
  const { readQuery } = useSuspenseQuery()
  const [count, setCount] = useState(2)

  const pokemonPromises = Array(count)
    .fill(null)
    .map((_, i) => readQuery(i.toString()))

  return (
    <div className="App">
      {pokemonPromises.map((promise, id) => {
        const data = use(promise)
        debugger

        return (
          <React.Fragment key={id}>
            <h3>{data.species.name}</h3>
          </React.Fragment>
        )
      })}
    </div>
  )
}
