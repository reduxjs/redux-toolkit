import type { CreateSelectorFunction, Selector } from 'reselect'
import { createDraftSafeSelector } from '../createDraftSafeSelector'
import type {
  EntityState,
  EntitySelectors,
  Dictionary,
  EntityId,
} from './models'

export type AnyCreateSelectorFunction = CreateSelectorFunction<
  (...args: unknown[]) => unknown,
  <F extends (...args: any[]) => any>(func: F) => F
>

export interface GetSelectorsOptions {
  createSelector?: AnyCreateSelectorFunction
}

export function createSelectorsFactory<T>() {
  function getSelectors(
    selectState?: undefined,
    options?: GetSelectorsOptions
  ): EntitySelectors<T, EntityState<T>>
  function getSelectors<V>(
    selectState: (state: V) => EntityState<T>,
    options?: GetSelectorsOptions
  ): EntitySelectors<T, V>
  function getSelectors<V>(
    selectState?: (state: V) => EntityState<T>,
    options: GetSelectorsOptions = {}
  ): EntitySelectors<T, any> {
    const { createSelector = createDraftSafeSelector } = options
    const selectIds = (state: EntityState<T>) => state.ids

    const selectEntities = (state: EntityState<T>) => state.entities

    const selectAll = createSelector(
      selectIds,
      selectEntities,
      (ids, entities): T[] => ids.map((id) => entities[id]!)
    )

    const selectId = (_: unknown, id: EntityId) => id

    const selectById = (entities: Dictionary<T>, id: EntityId) => entities[id]

    const selectTotal = createSelector(selectIds, (ids) => ids.length)

    if (!selectState) {
      return {
        selectIds,
        selectEntities,
        selectAll,
        selectTotal,
        selectById: createSelector(selectEntities, selectId, selectById),
      }
    }

    const selectGlobalizedEntities = createSelector(
      selectState as Selector<V, EntityState<T>>,
      selectEntities
    )

    return {
      selectIds: createSelector(selectState, selectIds),
      selectEntities: selectGlobalizedEntities,
      selectAll: createSelector(selectState, selectAll),
      selectTotal: createSelector(selectState, selectTotal),
      selectById: createSelector(
        selectGlobalizedEntities,
        selectId,
        selectById
      ),
    }
  }

  return { getSelectors }
}
