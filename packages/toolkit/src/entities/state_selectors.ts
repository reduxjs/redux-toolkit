import { createDraftSafeSelector } from '../createDraftSafeSelector'
import type { CreateSelectorFunction } from '../reselectImports'
import type { EntityId, EntitySelectors, EntityState } from './models'

type AnyCreateSelectorFunction = CreateSelectorFunction<any, any, any>

export type GetSelectorsOptions = {
  /**
   * @default createDraftSafeSelector
   */
  createSelector?: AnyCreateSelectorFunction
}

export function createSelectorsFactory<
  EntityType,
  EntityIdType extends EntityId,
>() {
  function getSelectors(
    selectState?: undefined,
    options?: GetSelectorsOptions,
  ): EntitySelectors<
    EntityType,
    EntityState<EntityType, EntityIdType>,
    EntityIdType
  >
  function getSelectors<StateType>(
    selectState: (state: StateType) => EntityState<EntityType, EntityIdType>,
    options?: GetSelectorsOptions,
  ): EntitySelectors<EntityType, StateType, EntityIdType>
  function getSelectors<StateType>(
    selectState?: (state: StateType) => EntityState<EntityType, EntityIdType>,
    options: GetSelectorsOptions = {},
  ): EntitySelectors<EntityType, any, EntityIdType> {
    const { createSelector = createDraftSafeSelector } = options

    const selectIds = (state: EntityState<EntityType, EntityIdType>) =>
      state.ids

    const selectEntities = (state: EntityState<EntityType, EntityIdType>) =>
      state.entities

    const selectAll = createSelector(
      selectIds,
      selectEntities,
      (ids, entities): EntityType[] => ids.map((id) => entities[id]),
    )

    const selectId = (
      _state: EntityState<EntityType, EntityIdType>,
      id: EntityIdType,
    ) => id

    const selectById = (
      entities: Record<EntityIdType, EntityType>,
      id: EntityIdType,
    ) => entities[id]

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

    const selectGlobalizedEntities = createSelector(selectState, selectEntities)

    return {
      selectIds: createSelector(selectState, selectIds),
      selectEntities: selectGlobalizedEntities,
      selectAll: createSelector(selectState, selectAll),
      selectTotal: createSelector(selectState, selectTotal),
      selectById: createSelector(
        selectGlobalizedEntities,
        selectId,
        selectById,
      ),
    }
  }

  return { getSelectors }
}
