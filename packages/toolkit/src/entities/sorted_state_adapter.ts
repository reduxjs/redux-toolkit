import type {
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityId,
  DraftableEntityState,
} from './models'
import type { BuildStateOperatorConfiguration } from './state_adapter'
import { buildCreateStateOperator } from './state_adapter'
import { buildCreateUnsortedStateAdapter } from './unsorted_state_adapter'
import {
  selectIdValue,
  ensureEntitiesArray,
  splitAddedUpdatedEntities,
} from './utils'

export function buildCreateSortedStateAdapter(
  config: BuildStateOperatorConfiguration
) {
  const createStateOperator = buildCreateStateOperator(config)
  const createUnsortedStateAdapter = buildCreateUnsortedStateAdapter(config)
  return function createSortedStateAdapter<T, Id extends EntityId>(
    selectId: IdSelector<T, Id>,
    sort: Comparer<T>
  ): EntityStateAdapter<T, Id> {
    type R = DraftableEntityState<T, Id>

    const { removeOne, removeMany, removeAll } =
      createUnsortedStateAdapter(selectId)

    function addOneMutably(entity: T, state: R): void {
      return addManyMutably([entity], state)
    }

    function addManyMutably(
      newEntities: readonly T[] | Record<Id, T>,
      state: R
    ): void {
      newEntities = ensureEntitiesArray(newEntities)

      const models = newEntities.filter(
        (model) => !(selectIdValue(model, selectId) in state.entities)
      )

      if (models.length !== 0) {
        merge(models, state)
      }
    }

    function setOneMutably(entity: T, state: R): void {
      return setManyMutably([entity], state)
    }

    function setManyMutably(
      newEntities: readonly T[] | Record<Id, T>,
      state: R
    ): void {
      newEntities = ensureEntitiesArray(newEntities)
      if (newEntities.length !== 0) {
        merge(newEntities, state)
      }
    }

    function setAllMutably(
      newEntities: readonly T[] | Record<Id, T>,
      state: R
    ): void {
      newEntities = ensureEntitiesArray(newEntities)
      state.entities = {} as Record<Id, T>
      state.ids = []

      addManyMutably(newEntities, state)
    }

    function updateOneMutably(update: Update<T, Id>, state: R): void {
      return updateManyMutably([update], state)
    }

    function updateManyMutably(
      updates: ReadonlyArray<Update<T, Id>>,
      state: R
    ): void {
      let appliedUpdates = false

      for (let update of updates) {
        const entity: T | undefined = (state.entities as Record<Id, T>)[
          update.id
        ]
        if (!entity) {
          continue
        }

        appliedUpdates = true

        Object.assign(entity, update.changes)
        const newId = selectId(entity)
        if (update.id !== newId) {
          delete (state.entities as Record<Id, T>)[update.id]
          ;(state.entities as Record<Id, T>)[newId] = entity
        }
      }

      if (appliedUpdates) {
        resortEntities(state)
      }
    }

    function upsertOneMutably(entity: T, state: R): void {
      return upsertManyMutably([entity], state)
    }

    function upsertManyMutably(
      newEntities: readonly T[] | Record<Id, T>,
      state: R
    ): void {
      const [added, updated] = splitAddedUpdatedEntities<T, Id>(
        newEntities,
        selectId,
        state
      )

      updateManyMutably(updated, state)
      addManyMutably(added, state)
    }

    function areArraysEqual(a: readonly unknown[], b: readonly unknown[]) {
      if (a.length !== b.length) {
        return false
      }

      for (let i = 0; i < a.length && i < b.length; i++) {
        if (a[i] === b[i]) {
          continue
        }
        return false
      }
      return true
    }

    function merge(models: readonly T[], state: R): void {
      // Insert/overwrite all new/updated
      models.forEach((model) => {
        ;(state.entities as Record<Id, T>)[selectId(model)] = model
      })

      resortEntities(state)
    }

    function resortEntities(state: R) {
      const allEntities = Object.values(state.entities) as T[]
      allEntities.sort(sort)

      const newSortedIds = allEntities.map(selectId)
      const { ids } = state

      if (!areArraysEqual(ids, newSortedIds)) {
        state.ids = newSortedIds
      }
    }

    return {
      removeOne,
      removeMany,
      removeAll,
      addOne: createStateOperator(addOneMutably),
      updateOne: createStateOperator(updateOneMutably),
      upsertOne: createStateOperator(upsertOneMutably),
      setOne: createStateOperator(setOneMutably),
      setMany: createStateOperator(setManyMutably),
      setAll: createStateOperator(setAllMutably),
      addMany: createStateOperator(addManyMutably),
      updateMany: createStateOperator(updateManyMutably),
      upsertMany: createStateOperator(upsertManyMutably),
    }
  }
}
