import type { Selector } from 'reselect'
import type { BuildCreateDraftSafeSelectorConfiguration } from '../createDraftSafeSelector'
import { buildCreateDraftSafeSelector } from '../createDraftSafeSelector'
import type {
  EntityState,
  EntitySelectors,
  Dictionary,
  EntityId,
} from './models'

export function buildCreateSelectorsFactory(
  config: BuildCreateDraftSafeSelectorConfiguration
) {
  const createDraftSafeSelector = buildCreateDraftSafeSelector(config)

  return function createSelectorsFactory<T, Id extends EntityId>() {
    function getSelectors(): EntitySelectors<T, EntityState<T, Id>, Id>
    function getSelectors<V>(
      selectState: (state: V) => EntityState<T, Id>
    ): EntitySelectors<T, V, Id>
    function getSelectors<V>(
      selectState?: (state: V) => EntityState<T, Id>
    ): EntitySelectors<T, any, Id> {
      const selectIds = (state: EntityState<T, Id>) => state.ids

      const selectEntities = (state: EntityState<T, Id>) => state.entities

      const selectAll = createDraftSafeSelector(
        selectIds,
        selectEntities,
        (ids, entities): T[] => ids.map((id) => entities[id]!)
      )

      const selectId = (_: unknown, id: Id) => id

      const selectById = (entities: Dictionary<T, Id>, id: Id) => entities[id]
      const selectTotal = createDraftSafeSelector(
        selectIds,
        (ids) => ids.length
      )

      if (!selectState) {
        return {
          selectIds,
          selectEntities,
          selectAll,
          selectTotal,
          selectById: createDraftSafeSelector(
            selectEntities,
            selectId,
            selectById
          ),
        }
      }

      const selectGlobalizedEntities = createDraftSafeSelector(
        selectState as Selector<V, EntityState<T, Id>>,
        selectEntities
      )

      return {
        selectIds: createDraftSafeSelector(selectState, selectIds),
        selectEntities: selectGlobalizedEntities,
        selectAll: createDraftSafeSelector(selectState, selectAll),
        selectTotal: createDraftSafeSelector(selectState, selectTotal),
        selectById: createDraftSafeSelector(
          selectGlobalizedEntities,
          selectId,
          selectById
        ),
      }
    }

    return { getSelectors }
  }
}
