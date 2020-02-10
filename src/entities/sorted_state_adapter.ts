import {
  EntityState,
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityMap
} from './models'
import { createStateOperator } from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import { selectIdValue } from './utils'

export function createSortedStateAdapter<T>(
  selectId: IdSelector<T>,
  sort: Comparer<T>
): EntityStateAdapter<T>
export function createSortedStateAdapter<T>(selectId: any, sort: any): any {
  type R = EntityState<T>

  const { removeOne, removeMany, removeAll } = createUnsortedStateAdapter(
    selectId
  )

  function addOneMutably(entity: T, state: R): void
  function addOneMutably(entity: any, state: any): void {
    return addManyMutably([entity], state)
  }

  function addManyMutably(newModels: T[], state: R): void
  function addManyMutably(newModels: any[], state: any): void {
    const models = newModels.filter(
      model => !(selectIdValue(model, selectId) in state.entities)
    )

    if (models.length !== 0) {
      merge(models, state)
    }
  }

  function setAllMutably(models: T[], state: R): void
  function setAllMutably(models: any[], state: any): void {
    state.entities = {}
    state.ids = []

    addManyMutably(models, state)
  }

  function updateOneMutably(update: Update<T>, state: R): void
  function updateOneMutably(update: any, state: any): void {
    return updateManyMutably([update], state)
  }

  function takeUpdatedModel(models: T[], update: Update<T>, state: R): boolean
  function takeUpdatedModel(models: any[], update: any, state: any): boolean {
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

  function updateManyMutably(updates: Update<T>[], state: R): void
  function updateManyMutably(updates: any[], state: any): void {
    const models: T[] = []

    updates.forEach(update => takeUpdatedModel(models, update, state))

    if (models.length !== 0) {
      merge(models, state)
    }
  }

  function mapMutably(map: EntityMap<T>, state: R): void
  function mapMutably(updatesOrMap: any, state: any): void {
    const updates: Update<T>[] = state.ids.reduce(
      (changes: any[], id: string | number) => {
        const change = updatesOrMap(state.entities[id])
        if (change !== state.entities[id]) {
          changes.push({ id, changes: change })
        }
        return changes
      },
      []
    )

    updateManyMutably(updates, state)
  }

  function upsertOneMutably(entity: T, state: R): void
  function upsertOneMutably(entity: any, state: any): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(entities: T[], state: R): void
  function upsertManyMutably(entities: any[], state: any): void {
    const added: any[] = []
    const updated: any[] = []

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

  function areArraysEqual(a: any[], b: any[]) {
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

  function merge(models: T[], state: R): void
  function merge(models: any[], state: any): void {
    models.sort(sort)

    // Insert/overwrite all new/updated
    models.forEach(model => {
      state.entities[selectId(model)] = model
    })

    const allEntities = Object.values(state.entities)
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
    upsertMany: createStateOperator(upsertManyMutably),
    map: createStateOperator(mapMutably)
  }
}
