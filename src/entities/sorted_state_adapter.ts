import {
  EntityState,
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityId
} from './models'
import { createStateOperator } from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import { selectIdValue } from './utils'

export function createSortedStateAdapter<T>(
  selectId: IdSelector<T>,
  sort: Comparer<T>
): EntityStateAdapter<T> {
  type R = EntityState<T>

  const { removeOne, removeMany, removeAll } = createUnsortedStateAdapter(
    selectId
  )

  function addOneMutably(entity: T, state: R): void {
    return addManyMutably([entity], state)
  }

  function addManyMutably(
    newModels: T[] | Record<EntityId, T>,
    state: R
  ): void {
    if (!Array.isArray(newModels)) {
      newModels = Object.values(newModels)
    }

    const models = newModels.filter(
      model => !(selectIdValue(model, selectId) in state.entities)
    )

    if (models.length !== 0) {
      merge(models, state)
    }
  }

  function setAllMutably(models: T[] | Record<EntityId, T>, state: R): void {
    if (!Array.isArray(models)) {
      models = Object.values(models)
    }
    state.entities = {}
    state.ids = []

    addManyMutably(models, state)
  }

  function updateOneMutably(update: Update<T>, state: R): void {
    return updateManyMutably([update], state)
  }

  function takeUpdatedModel(models: T[], update: Update<T>, state: R): boolean {
    if (!(update.id in state.entities)) {
      return false
    }

    const original = state.entities[update.id]
    const updated = Object.assign({}, original, update.changes)
    const newKey = selectIdValue(updated, selectId)

    delete state.entities[update.id]

    models.push(updated)

    return newKey !== update.id
  }

  function updateManyMutably(updates: Update<T>[], state: R): void {
    const models: T[] = []

    updates.forEach(update => takeUpdatedModel(models, update, state))

    if (models.length !== 0) {
      merge(models, state)
    }
  }

  function upsertOneMutably(entity: T, state: R): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(
    entities: T[] | Record<EntityId, T>,
    state: R
  ): void {
    if (!Array.isArray(entities)) {
      entities = Object.values(entities)
    }

    const added: T[] = []
    const updated: Update<T>[] = []

    for (const entity of entities) {
      const id = selectIdValue(entity, selectId)
      if (id in state.entities) {
        updated.push({ id, changes: entity })
      } else {
        added.push(entity)
      }
    }

    updateManyMutably(updated, state)
    addManyMutably(added, state)
  }

  function areArraysEqual(a: unknown[], b: unknown[]) {
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

  function merge(models: T[], state: R): void {
    models.sort(sort)

    // Insert/overwrite all new/updated
    models.forEach(model => {
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
    setAll: createStateOperator(setAllMutably),
    addMany: createStateOperator(addManyMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertMany: createStateOperator(upsertManyMutably)
  }
}
