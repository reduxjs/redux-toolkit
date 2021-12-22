import type {
  EntityState,
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityId,
} from './models'
import { createStateOperator } from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import {
  selectIdValue,
  ensureEntitiesArray,
  splitAddedUpdatedEntities,
} from './utils'

export function createSortedStateAdapter<T>(
  selectId: IdSelector<T>,
  sort: Comparer<T>
): EntityStateAdapter<T> {
  type R = EntityState<T>

  const { removeOne, removeMany, removeAll } =
    createUnsortedStateAdapter(selectId)

  function addOneMutably(entity: T, state: R): void {
    return addManyMutably([entity], state)
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<EntityId, T>,
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
    newEntities: readonly T[] | Record<EntityId, T>,
    state: R
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    if (newEntities.length !== 0) {
      merge(newEntities, state)
    }
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<EntityId, T>,
    state: R
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    state.entities = {}
    state.ids = []

    addManyMutably(newEntities, state)
  }

  function updateOneMutably(update: Update<T>, state: R): void {
    return updateManyMutably([update], state)
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T>>,
    state: R
  ): void {
    const changedKeys: EntityId[] = []

    const updatesPerEntity: { [id: string]: Update<T> } = {}

    updates.forEach((update) => {
      if (update.id in state.entities) {
        updatesPerEntity[update.id] = {
          id: update.id,
          changes: {
            ...(updatesPerEntity[update.id]
              ? updatesPerEntity[update.id].changes
              : null),
            ...update.changes,
          },
        }
      }
      const newId = selectId(update.changes as T)
      if (newId !== undefined && update.id !== newId) {
        changedKeys.push(update.id)
      }
    })

    updates = Object.values(updatesPerEntity)

    if (updates.length > 0) {
      const models = updates.map(
        (update) =>
          Object.assign({}, state.entities[update.id], update.changes) as T
      )
      changedKeys.forEach((key) => delete state.entities[key])
      merge(models, state)
    }
  }

  function upsertOneMutably(entity: T, state: R): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<EntityId, T>,
    state: R
  ): void {
    const [added, updated] = splitAddedUpdatedEntities<T>(
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
      state.entities[selectId(model)] = model
    })

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
