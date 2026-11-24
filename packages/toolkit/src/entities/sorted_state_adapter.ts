import type { Draft } from '../draftTypes'
import type { EntityChangeRecord } from './entity_core'
import { createEntityCore } from './entity_core'
import type {
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityId,
  DraftableEntityState,
  RemoveManyFilter,
} from './models'
import {
  createSingleArgumentStateOperator,
  createStateOperator,
} from './state_adapter'
import { getCurrent, selectIdValue } from './utils'

// Borrowed from Replay
export function findInsertIndex<T>(
  sortedItems: T[],
  item: T,
  comparisonFunction: Comparer<T>,
): number {
  let lowIndex = 0
  let highIndex = sortedItems.length
  while (lowIndex < highIndex) {
    let middleIndex = (lowIndex + highIndex) >>> 1
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

export function createSortedStateAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
  comparer: Comparer<T>,
): EntityStateAdapter<T, Id> {
  type R = DraftableEntityState<T, Id>

  const core = createEntityCore<T, Id>(selectId)

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

  function applySortedChanges(state: R, changes: EntityChangeRecord<Id>): void {
    const { added, updated, removed, renamed } = changes
    const hasRenames = Object.keys(renamed).length > 0

    if (
      added.length === 0 &&
      updated.length === 0 &&
      removed.length === 0 &&
      !hasRenames
    ) {
      return
    }

    if (added.length === 0 && updated.length === 0 && !hasRenames) {
      if (state.ids.length > 0) {
        const removedIds = new Set<string>(removed.map(String))
        state.ids = getCurrent(state.ids as Id[]).filter(
          (id) => !removedIds.has(String(id)),
        ) as Id[] | Draft<Id[]>
      }
      return
    }

    const currentEntities = getCurrent(state.entities) as Record<Id, T>
    const currentIds = getCurrent(state.ids as Id[])

    const survivingIds: Id[] = hasRenames
      ? Array.from(
          new Set(
            currentIds
              .map((id) => renamed[id] ?? id)
              .filter((id) => id in currentEntities),
          ),
        )
      : currentIds

    const wasPreviouslyEmpty = survivingIds.length === 0

    let sortedEntities: T[] = []

    if (wasPreviouslyEmpty) {
      sortedEntities = added.map((id) => currentEntities[id]).sort(comparer)
    } else if (updated.length === 0) {
      for (const id of survivingIds) {
        const entity = currentEntities[id]
        if (entity) {
          sortedEntities.push(entity)
        }
      }
      for (const id of added) {
        insert(sortedEntities, currentEntities[id], comparer)
      }
    } else {
      const updatedSet = new Set<Id>(updated)
      let stillSorted = true

      for (let i = 0; i < survivingIds.length; i++) {
        const id = survivingIds[i]
        if (!updatedSet.has(id)) {
          continue
        }
        const entity = currentEntities[id]
        if (
          (i > 0 &&
            comparer(currentEntities[survivingIds[i - 1]], entity) > 0) ||
          (i < survivingIds.length - 1 &&
            comparer(entity, currentEntities[survivingIds[i + 1]]) > 0)
        ) {
          stillSorted = false
          break
        }
      }

      if (stillSorted) {
        for (const id of survivingIds) {
          sortedEntities.push(currentEntities[id])
        }
      } else {
        const toReinsert: T[] = []
        for (const id of survivingIds) {
          if (updatedSet.has(id)) {
            toReinsert.push(currentEntities[id])
          } else {
            sortedEntities.push(currentEntities[id])
          }
        }
        for (const entity of toReinsert) {
          insert(sortedEntities, entity, comparer)
        }
      }

      for (const id of added) {
        insert(sortedEntities, currentEntities[id], comparer)
      }
    }

    const newSortedIds = sortedEntities.map((entity) =>
      selectIdValue(entity, selectId),
    )

    if (!areArraysEqual(currentIds, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  function addOneMutably(entity: T, state: R): void {
    applySortedChanges(state, core.addOne(entity, state))
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    applySortedChanges(state, core.addMany(newEntities, state))
  }

  function setOneMutably(entity: T, state: R): void {
    applySortedChanges(state, core.setOne(entity, state))
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    applySortedChanges(state, core.setMany(newEntities, state))
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    applySortedChanges(state, core.setAll(newEntities, state))
  }

  function removeOneMutably(key: Id, state: R): void {
    applySortedChanges(state, core.removeOne(key, state))
  }

  function removeManyMutably(
    keysOrFilter: readonly Id[] | RemoveManyFilter<T>,
    state: R,
  ): void {
    applySortedChanges(state, core.removeMany(keysOrFilter, state))
  }

  function removeAllMutably(state: R): void {
    core.removeAll(state)
  }

  function updateOneMutably(update: Update<T, Id>, state: R): void {
    applySortedChanges(state, core.updateOne(update, state))
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
  ): void {
    applySortedChanges(state, core.updateMany(updates, state))
  }

  function upsertOneMutably(entity: T, state: R): void {
    applySortedChanges(state, core.upsertOne(entity, state))
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    applySortedChanges(state, core.upsertMany(newEntities, state))
  }

  return {
    removeOne: createStateOperator(removeOneMutably),
    removeMany: createStateOperator(removeManyMutably),
    removeAll: createSingleArgumentStateOperator(removeAllMutably),
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
