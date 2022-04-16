import * as React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { pokemonEvolutions } from './pokemon.data'
import { PokemonPlaceholder } from './PokemonPlaceholder'
import { PokemonWithEvolution } from './PokemonWithEvolution'

const evolutionsKeys = Object.keys(
  pokemonEvolutions
) as (keyof typeof pokemonEvolutions)[]

export const PokemonParallelQueries = React.memo(
  function PokemonParallelQueries() {
    const [evolutions, setEvolutions] = React.useState([
      'bulbasaur' as keyof typeof pokemonEvolutions,
    ])

    return (
      <article className="parallel-queries">
        <h2>Suspense: indipendent parallel queries</h2>
        <form
          className="select-pokemon-form"
          action="#"
          onSubmit={(evt) => {
            evt.preventDefault()

            const formValues = new FormData(evt.currentTarget)

            const next = Boolean(formValues.get('addBulbasaur'))
              ? 'bulbasaur'
              : evolutionsKeys[
                  Math.floor(Math.random() * evolutionsKeys.length)
                ]

            setEvolutions((curr) => curr.concat(next))
          }}
        >
          <label htmlFor="addBulbasaurandEvolution">
            addBulbasaur
            <input
              type="checkbox"
              name="addBulbasaur"
              id="addBulbasaurandEvolution"
            />
          </label>
          <button type="submit">Add pokemon + evolution</button>
        </form>
        <div className="pokemon-list">
          {evolutions.map((name, idx) => (
            <ErrorBoundary
              key={idx}
              onError={console.error}
              fallbackRender={({ resetErrorBoundary, error }) => (
                <>
                  <PokemonPlaceholder
                    name={name}
                    error={error}
                    onRetry={() => {
                      (error as any)?.retryQuery?.();
                      resetErrorBoundary()
                    }}
                  />
                  <PokemonPlaceholder
                    name={pokemonEvolutions[name]}
                    error={error}
                    onRetry={() => {
                      (error as any)?.retryQuery?.()
                      resetErrorBoundary()
                    }}
                  />
                </>
              )}
            >
              <React.Suspense
                fallback={
                  <>
                    <PokemonPlaceholder name={name} />
                    <PokemonPlaceholder name={pokemonEvolutions[name]} />
                  </>
                }
              >
                <PokemonWithEvolution
                  key={idx}
                  base={name}
                  evolution={pokemonEvolutions[name]}
                />
              </React.Suspense>
            </ErrorBoundary>
          ))}
        </div>
      </article>
    )
  }
)
