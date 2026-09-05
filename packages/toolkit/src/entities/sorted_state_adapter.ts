import type {
  Comparer,
  DraftableEntityState,
  EntityId,
  EntityStateAdapter,
  IdSelector,
  Update,
} from './models'
import { createStateOperator } from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import {
  ensureEntitiesArray,
  getCurrent,
  selectIdValue,
  splitAddedUpdatedEntities,
} from './utils'

// Borrowed from Replay
export function findInsertIndex<T>(
  sortedItems: T[],
  item: T,
  comparisonFunction: Comparer<T>,
): number {
  let lowIndex = 0
  let highIndex = sortedItems.length
  while (lowIndex < highIndex) {
    const middleIndex = (lowIndex + highIndex) >>> 1
    const currentItem = sortedItems[middleIndex]
    const res = comparisonFunction(item, currentItem)
    if (res >= 0) {
      lowIndex = middleIndex + 1
    } else {
      highIndex = middleIndex
    }
  }

  return lowIndex
}

export function insert<T>(
  sortedItems: T[],
  item: T,
  comparisonFunction: Comparer<T>,
): T[] {
  const insertAtIndex = findInsertIndex(sortedItems, item, comparisonFunction)

  sortedItems.splice(insertAtIndex, 0, item)

  return sortedItems
}

export function createSortedStateAdapter<T, EntityIdType extends EntityId>(
  selectId: IdSelector<T, EntityIdType>,
  comparer: Comparer<T>,
): EntityStateAdapter<T, EntityIdType> {
  type R = DraftableEntityState<T, EntityIdType>

  const { removeOne, removeMany, removeAll } =
    createUnsortedStateAdapter(selectId)

  function addOneMutably(entity: T, state: R): void {
    return addManyMutably([entity], state)
  }

  const mergeFunction: MergeFunction = (
    state,
    addedItems,
    appliedUpdates,
    replacedIds,
  ) => {
    const currentEntities = getCurrent(
      state.entities as Record<EntityIdType, T>,
    )
    const currentIds = getCurrent<EntityIdType[]>(state.ids)

    const stateEntities = state.entities as Record<EntityIdType, T>

    let ids: Iterable<EntityIdType> = currentIds
    if (replacedIds) {
      ids = new Set(currentIds)
    }

    let sortedEntities: T[] = []
    for (const id of ids) {
      const entity = currentEntities[id]
      if (entity) {
        sortedEntities.push(entity)
      }
    }
    const wasPreviouslyEmpty = sortedEntities.length === 0

    // Insert/overwrite all new/updated
    for (const item of addedItems) {
      stateEntities[selectId(item)] = item

      if (!wasPreviouslyEmpty) {
        // Binary search insertion generally requires fewer comparisons
        insert(sortedEntities, item, comparer)
      }
    }

    if (wasPreviouslyEmpty) {
      // All we have is the incoming values, sort them
      sortedEntities = addedItems.slice().sort(comparer)
    } else if (appliedUpdates) {
      // We should have a _mostly_-sorted array already
      sortedEntities.sort(comparer)
    }

    const newSortedIds = sortedEntities.map(selectId)

    if (!areArraysEqual(currentIds, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
    existingIds?: EntityIdType[],
  ): void {
    newEntities = ensureEntitiesArray(newEntities)

    const existingKeys = new Set<EntityIdType>(
      existingIds ?? getCurrent<EntityIdType[]>(state.ids),
    )
    const addedKeys = new Set<EntityIdType>()
    const models = newEntities.filter((model) => {
      const modelId = selectIdValue(model, selectId)
      const notAdded = !addedKeys.has(modelId)
      if (notAdded) addedKeys.add(modelId)
      return !existingKeys.has(modelId) && notAdded
    })

    if (models.length !== 0) {
      mergeFunction(state, models)
    }
  }

  function setOneMutably(entity: T, state: R): void {
    return setManyMutably([entity], state)
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    const deduplicatedEntities = {} as Record<EntityIdType, T>
    newEntities = ensureEntitiesArray(newEntities)
    if (newEntities.length !== 0) {
      for (const item of newEntities) {
        const entityId = selectId(item)
        // For multiple items with the same ID, we should keep the last one.
        deduplicatedEntities[entityId] = item
        delete (state.entities as Record<EntityIdType, T>)[entityId]
      }
      newEntities = ensureEntitiesArray(deduplicatedEntities)
      mergeFunction(state, newEntities)
    }
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    state.entities = {} as Record<EntityIdType, T>
    state.ids = []

    setManyMutably(newEntities, state)
  }

  function updateOneMutably(update: Update<T, EntityIdType>, state: R): void {
    return updateManyMutably([update], state)
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, EntityIdType>>,
    state: R,
  ): void {
    let appliedUpdates = false
    let replacedIds = false

    // Pre-merge all updates that target the same entity ID so that later
    // changes always win for every field—including `id`.  Without this step,
    // the first rename moves the entity to a new key; a subsequent update that
    // still targets the original key finds nothing and is silently dropped,
    // producing results inconsistent with the unsorted adapter.
    const updatesPerEntity: { [id: string]: Update<T, EntityIdType> } = {}
    for (const update of updates) {
      // Only collect updates for entities that currently exist (same guard
      // used by the unsorted adapter).
      if (update.id in (state.entities as Record<EntityIdType, T>)) {
        updatesPerEntity[update.id] = {
          id: update.id,
          changes: {
            ...updatesPerEntity[update.id]?.changes,
            ...update.changes,
          },
        }
      }
    }

    for (const update of Object.values(updatesPerEntity) as Update<
      T,
      EntityIdType
    >[]) {
      const entity: T | undefined = (state.entities as Record<EntityIdType, T>)[
        update.id
      ]
      if (!entity) {
        continue
      }

      appliedUpdates = true

      Object.assign(entity, update.changes)
      const newId = selectId(entity)

      if (update.id !== newId) {
        // We do support the case where updates can change an item's ID.
        // This makes things trickier - go ahead and swap the IDs in state now.
        replacedIds = true
        delete (state.entities as Record<EntityIdType, T>)[update.id]
        const oldIndex = (state.ids as EntityIdType[]).indexOf(update.id)
        state.ids[oldIndex] = newId
        ;(state.entities as Record<EntityIdType, T>)[newId] = entity
      }
    }

    if (appliedUpdates) {
      mergeFunction(state, [], appliedUpdates, replacedIds)
    }
  }

  function upsertOneMutably(entity: T, state: R): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    const [added, updated, existingIdsArray] = splitAddedUpdatedEntities<
      T,
      EntityIdType
    >(newEntities, selectId, state)

    if (added.length) {
      addManyMutably(added, state, existingIdsArray)
    }
    if (updated.length) {
      updateManyMutably(updated, state)
    }
  }

  function areArraysEqual(a: readonly unknown[], b: readonly unknown[]) {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) {
        continue
      }
      return false
    }
    return true
  }

  type MergeFunction = (
    state: R,
    addedItems: readonly T[],
    appliedUpdates?: boolean,
    replacedIds?: boolean,
  ) => void

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
