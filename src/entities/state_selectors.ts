import { createSelector } from 'reselect'
import { EntityState, EntitySelectors, Dictionary } from './models'

export function createSelectorsFactory<T>() {
  function getSelectors(): EntitySelectors<T, EntityState<T>>
  function getSelectors<V>(
    selectState: (state: V) => EntityState<T>
  ): EntitySelectors<T, V>
  function getSelectors(
    selectState?: (state: any) => EntityState<T>
  ): EntitySelectors<T, any> {
    const selectIds = (state: any) => state.ids
    const selectEntities = (state: EntityState<T>) => state.entities
    const selectAll = createSelector(
      selectIds,
      selectEntities,
      (ids: T[], entities: Dictionary<T>): any =>
        ids.map((id: any) => (entities as any)[id])
    )

    const selectTotal = createSelector(selectIds, ids => ids.length)

    if (!selectState) {
      return {
        selectIds,
        selectEntities,
        selectAll,
        selectTotal
      }
    }

    return {
      selectIds: createSelector(selectState, selectIds),
      selectEntities: createSelector(selectState, selectEntities),
      selectAll: createSelector(selectState, selectAll),
      selectTotal: createSelector(selectState, selectTotal)
    }
  }

  return { getSelectors }
}
