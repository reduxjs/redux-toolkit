import {
  EntityState,
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityId,
  IndexComparers
} from './models'
import {
  createStateOperator,
  createSingleArgumentStateOperator
} from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import {
  selectIdValue,
  ensureEntitiesArray,
  splitAddedUpdatedEntities
} from './utils'

export function createSortedStateAdapter<T>(
  selectId: IdSelector<T>,
  sort: Comparer<T>,
  indices: IndexComparers<T> = {}
): EntityStateAdapter<T> {
  type R = EntityState<T>

  const { removeOne, removeMany, removeAll } = createUnsortedStateAdapter(
    selectId
  )

  function addOneMutably(entity: T, state: R): void {
    return addManyMutably([entity], state)
  }

  function addManyMutably(
    newEntities: T[] | Record<EntityId, T>,
    state: R
  ): void {
    newEntities = ensureEntitiesArray(newEntities)

    const models = newEntities.filter(
      model => !(selectIdValue(model, selectId) in state.entities)
    )

    if (models.length !== 0) {
      merge(models, state)
    }
  }

  function setAllMutably(
    newEntities: T[] | Record<EntityId, T>,
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
    newEntities: T[] | Record<EntityId, T>,
    state: R
  ): void {
    const { added, updated } = splitAddedUpdatedEntities<T>(
      newEntities,
      selectId,
      state
    )

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

  function updateSortedIds(
    obj: Record<string, EntityId[]>,
    key: string,
    allEntities: T[],
    sortComparer: Comparer<T>
  ) {
    const sortedEntities = allEntities.slice().sort(sortComparer)
    const sortedIds = sortedEntities.map(selectId)
    const ids = obj[key]

    if (!areArraysEqual(ids, sortedIds)) {
      obj[key] = sortedIds
    }
  }

  function merge(models: T[], state: R): void {
    models.sort(sort)

    // Insert/overwrite all new/updated
    models.forEach(model => {
      state.entities[selectId(model)] = model
    })

    updateSortedIndices(state)
  }

  function removeOneSortedIndices(key: EntityId, state: R): void {
    removeOne(state, key)
    updateSortedIndices(state)
  }

  function removeManySortedIndices(keys: EntityId[], state: R): void {
    removeMany(state, keys)
    updateSortedIndices(state)
  }

  function removeAllSortedIndices(state: R): void {
    const newIndices = {} as any

    for (let key in indices) {
      newIndices[key] = []
    }

    Object.assign(state, {
      ids: [],
      entities: {},
      indices: newIndices
    })
  }

  function updateSortedIndices(state: EntityState<T>) {
    const allEntities = Object.values(state.entities) as T[]
    updateSortedIds(
      (state as unknown) as Record<string, EntityId[]>,
      'ids',
      allEntities,
      sort
    )

    for (let key in indices) {
      updateSortedIds(state.indices, key, allEntities, indices[key])
    }
  }

  return {
    removeOne: createStateOperator(removeOneSortedIndices),
    removeMany: createStateOperator(removeManySortedIndices),
    removeAll: createSingleArgumentStateOperator(removeAllSortedIndices),
    addOne: createStateOperator(addOneMutably),
    updateOne: createStateOperator(updateOneMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    setAll: createStateOperator(setAllMutably),
    addMany: createStateOperator(addManyMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertMany: createStateOperator(upsertManyMutably)
  }
}
