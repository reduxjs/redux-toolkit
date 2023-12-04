import type { EntityId, EntityState } from './models'

export function getInitialEntityState<T, Id extends EntityId>(): EntityState<
  T,
  Id
> {
  return {
    ids: [],
    entities: {} as Record<Id, T>,
  }
}

export function createInitialStateFactory<T, Id extends EntityId>() {
  function getInitialState(): EntityState<T, Id>
  function getInitialState<S extends object>(
    additionalState: S
  ): EntityState<T, Id> & S
  function getInitialState(additionalState: any = {}): any {
    return Object.assign(getInitialEntityState(), additionalState)
  }

  return { getInitialState }
}
