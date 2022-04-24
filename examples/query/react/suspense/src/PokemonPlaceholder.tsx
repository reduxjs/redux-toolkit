import * as React from 'react'
import clsx from 'clsx'
import { PokemonName } from './pokemon.data'

export interface PokemonPlaceholderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  name: PokemonName
  error?: Error | undefined
  onRetry?(): void
}

export function PokemonPlaceholder({
  name,
  children,
  className,
  error,
  onRetry,
  ...otherProps
}: PokemonPlaceholderProps) {
  const isError = !!error

  let content: React.ReactNode = isError ? (
    <>
      <h3 className='alert__heading'>An error has occurred while loading {name}</h3>
      <div>{error?.message}</div>
      {onRetry && (
        <button type="button" className="btn alert__btn" onClick={onRetry}>
          retry
        </button>
      )}
      {children}
    </>
  ) : (
    <>
      <h3 className='alert__heading'>Loading pokemon {name}</h3>
      <br />
      (Suspense fallback)
      {children}
    </>
  )

  return (
    <section
      className={clsx(
        'pokemon-card',
        'pokemon-cart--placeholder',
        { 'alert--danger': isError, 'alert--info': !isError },
        className
      )}
      {...otherProps}
    >
      {content}
    </section>
  )
}
