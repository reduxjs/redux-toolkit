import { Suspense, useState } from 'react'
import { Pokemon } from './Pokemon'
import { PokemonName } from './pokemon.data'
import { ErrorBoundary } from 'react-error-boundary'

export interface SuspendedPokemonProps {
  name: PokemonName
  suspendOnRefetch: boolean
  throwOnIntialRender: boolean
}

function BuggyComponent({ errorCount, name }:Pick<SuspendedPokemonProps, 'name'> & { errorCount: number }) {
  if(!errorCount) {
    throw new Error('error while rendering:' + name)
  }

  return <></>
}

export function SuspendedPokemon({
  name,
  suspendOnRefetch,
  throwOnIntialRender,
}: SuspendedPokemonProps) {
  const [errorCount, setErrorCount] = useState(0)

  return (
    <div>
      <ErrorBoundary
        onReset={() => setErrorCount((n) => n + 1)}
        fallbackRender={({ resetErrorBoundary, error }) => {
          return (
            <section>
              <h3>render {name} error</h3>
              <p>{String(error)}</p>
              <div>
                <button type="button" onClick={resetErrorBoundary}>
                  reset error boundary
                </button>
              </div>
            </section>
          )
        }}
      >
        {throwOnIntialRender && <BuggyComponent name={name} errorCount={errorCount} />}
        <Suspense
          fallback={
            <div>
              suspense fallback <br />
              loading pokemon {name}
            </div>
          }
        >
          <Pokemon name={name} suspendOnRefetch={suspendOnRefetch} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
