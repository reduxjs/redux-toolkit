import type {
  EntityId,
  EntityState,
  EntityStateAdapter,
  EntityStateFactory,
} from './models'

export function getInitialEntityState<
  T,
  EntityIdType extends EntityId,
>(): EntityState<T, EntityIdType> {
  return {
    ids: [],
    entities: {} as Record<EntityIdType, T>,
  }
}

export function createInitialStateFactory<T, EntityIdType extends EntityId>(
  stateAdapter: EntityStateAdapter<T, EntityIdType>,
): EntityStateFactory<T, EntityIdType> {
  function getInitialState(
    state?: undefined,
    entities?: readonly T[] | Record<EntityIdType, T>,
  ): EntityState<T, EntityIdType>
  function getInitialState<S extends object>(
    additionalState: S,
    entities?: readonly T[] | Record<EntityIdType, T>,
  ): EntityState<T, EntityIdType> & S
  function getInitialState(
    additionalState: any = {},
    entities?: readonly T[] | Record<EntityIdType, T>,
  ): any {
    const state = Object.assign(getInitialEntityState(), additionalState)
    return entities ? stateAdapter.setAll(state, entities) : state
  }

  return { getInitialState }
}
