import type { EntityId, EntityState } from './models'

export function getInitialEntityState<V, Id extends EntityId>(): EntityState<
  V,
  Id
> {
  return {
    ids: [],
    entities: {},
  }
}

export function createInitialStateFactory<V, Id extends EntityId>() {
  function getInitialState(): EntityState<V, Id>
  function getInitialState<S extends object>(
    additionalState: S
  ): EntityState<V, Id> & S
  function getInitialState(additionalState: any = {}): any {
    return Object.assign(getInitialEntityState(), additionalState)
  }

  return { getInitialState }
}
