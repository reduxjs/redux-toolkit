import { EntityState, IndexComparers, BasicObject, Indices } from './models'

export function getInitialEntityState<V, IC extends IndexComparers<V>>(
  indexComparers: IC
): EntityState<V, IC> {
  const indices = {} as Indices<V, IC>

  for (let key in indexComparers) {
    indices[key] = []
  }

  return {
    ids: [],
    entities: {},
    indices
  }
}

export function createInitialStateFactory<V, IC extends IndexComparers<V>>(
  indexComparers: IC
) {
  function getInitialState(): EntityState<V>
  function getInitialState<S extends object>(
    additionalState: S
  ): EntityState<V> & S
  function getInitialState(additionalState: any = {}): any {
    return Object.assign(
      getInitialEntityState(indexComparers as any),
      additionalState
    )
  }

  return { getInitialState }
}
