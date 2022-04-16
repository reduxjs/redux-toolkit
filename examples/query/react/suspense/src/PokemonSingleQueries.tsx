import { SuspenseQueryError } from '@reduxjs/toolkit/dist/query/react'
import * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Pokemon, PokemonProps } from './Pokemon'
import { POKEMON_NAMES } from './pokemon.data'
import { PokemonPlaceholder } from './PokemonPlaceholder'

const getRandomPokemonName = () =>
  POKEMON_NAMES[Math.floor(Math.random() * POKEMON_NAMES.length)]

export const PokemonSingleQueries = React.memo(function PokemonSingleQueries() {
  const [pokemonConf, setPokemonConf] = React.useState<PokemonProps[]>([
    { name: 'bulbasaur' },
  ])

  return (
    <article className="pokemon-article">
      <h2>Suspense: single query</h2>
      <form
        className="select-pokemon-form"
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
            },
          ])
        }}
      >
        <label htmlFor="addBulbasaur">
          addBulbasaur
          <input type="checkbox" name="addBulbasaur" id="addBulbasaur" />
        </label>
        <button className="btn">Add pokemon</button>
      </form>
      <div className="pokemon-list">
        {pokemonConf.map((pokemonProps, idx) => (
          <ErrorBoundary
            key={idx}
            onError={console.error}
            fallbackRender={({ resetErrorBoundary, error }) => (
              <PokemonPlaceholder
                name={pokemonProps.name}
                error={error}
                onRetry={() => {
                  (error as any)?.retryQuery?.()
                  resetErrorBoundary()
                }}
              />
            )}
          >
            <React.Suspense
              fallback={<PokemonPlaceholder name={pokemonProps.name} />}
            >
              <Pokemon {...pokemonProps} />
            </React.Suspense>
          </ErrorBoundary>
        ))}
      </div>
    </article>
  )
})
