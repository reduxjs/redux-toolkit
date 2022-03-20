import * as React from 'react'
import { POKEMON_NAMES } from './pokemon.data'
import './styles.css'
import { SuspendedPokemon, SuspendedPokemonProps } from './SuspendedPokemon'

const getRandomPokemonName = () =>
  POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)]

export default function App() {
  const [pokemonConf, setPokemonConf] = React.useState<SuspendedPokemonProps[]>(
    [{ name: 'bulbasaur', suspendOnRefetch: false, throwOnIntialRender: false }]
  )

  return (
    <div className="App">
      <div>
        <form
          action="#"
          onSubmit={(evt) => {
            evt.preventDefault()

            const formValues = new FormData(evt.currentTarget)

            setPokemonConf((prev) => [
              ...prev,
              {
                name: Boolean(formValues.get('addBulbasaur'))
                  ? 'bulbasaur'
                  : getRandomPokemonName(),
                suspendOnRefetch: Boolean(formValues.get('suspendOnRefetch')),
                throwOnIntialRender: Boolean(
                  formValues.get('throwOnIntialRender')
                ),
              },
            ])
          }}
        >
          <label htmlFor="suspendOnRefetch">
            suspendOnRefetch
            <input
              type="checkbox"
              name="suspendOnRefetch"
              id="suspendOnRefetch"
            />
          </label>
          <label htmlFor="addBulbasaur">
            addBulbasaur
            <input type="checkbox" name="addBulbasaur" id="addBulbasaur" />
          </label>
          <label htmlFor="throwOnIntialRender">
            throwOnIntialRender
            <input
              type="checkbox"
              name="throwOnIntialRender"
              id="throwOnIntialRender"
            />
          </label>
          <button>Add pokemon</button>
        </form>
      </div>
      <div className="pokemon-list">
        {pokemonConf.map((suspendedPokemonProps, index) => (
          <SuspendedPokemon key={index} {...suspendedPokemonProps} />
        ))}
      </div>
    </div>
  )
}
