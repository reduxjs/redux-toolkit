import type { Draft } from '../draftTypes'
import type { EntityChangeRecord } from './entity_core'
import { createEntityCore, hasOwnEntity } from './entity_core'
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
import { getCurrent } from './utils'

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
  type SortedEntry = { id: Id; entity: T }

  const core = createEntityCore<T, Id>(selectId)
  const compareEntries: Comparer<SortedEntry> = (a, b) =>
    comparer(a.entity, b.entity)

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

  function applySortedChanges(
    state: R,
    changes: EntityChangeRecord<Id>,
    reinsertUpdated: boolean = false,
  ): void {
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

    if (reinsertUpdated) {
      // For setOne / setMany / setAll, replaced entities are reinserted in
      // their deduplicated batch order alongside new additions.
      const reinsertedIds = (changes.ordered ?? [...updated, ...added]).filter(
        (id) => hasOwnEntity(currentEntities, id),
      )
      const reinsertedSet = new Set<string>(reinsertedIds.map(String))
      const retainedEntries: SortedEntry[] = []

      for (const id of currentIds) {
        if (
          !reinsertedSet.has(String(id)) &&
          hasOwnEntity(currentEntities, id)
        ) {
          retainedEntries.push({ id, entity: currentEntities[id] })
        }
      }

      let sortedEntries: SortedEntry[]
      if (retainedEntries.length === 0) {
        sortedEntries = reinsertedIds
          .map((id) => ({ id, entity: currentEntities[id] }))
          .sort(compareEntries)
      } else {
        sortedEntries = retainedEntries
        for (const id of reinsertedIds) {
          insert(
            sortedEntries,
            { id, entity: currentEntities[id] },
            compareEntries,
          )
        }
      }

      const newSortedIds = sortedEntries.map((entry) => entry.id)
      if (!areArraysEqual(currentIds, newSortedIds)) {
        state.ids = newSortedIds
      }
      return
    }

    const addedSet = new Set<Id>(added)
    const survivingIds: Id[] = []
    const seenSurviving = new Set<Id>()

    for (const rawId of currentIds) {
      const id = hasOwnEntity(renamed, rawId) ? renamed[rawId] : rawId
      if (!seenSurviving.has(id) && hasOwnEntity(currentEntities, id)) {
        seenSurviving.add(id)
        survivingIds.push(id)
      }
    }

    const effectiveAdded = added.filter(
      (id) => !seenSurviving.has(id) && hasOwnEntity(currentEntities, id),
    )

    const wasPreviouslyEmpty = survivingIds.length === 0
    let sortedEntries: SortedEntry[] = []

    try {
      if (wasPreviouslyEmpty) {
        sortedEntries = effectiveAdded
          .map((id) => ({ id, entity: currentEntities[id] }))
          .sort(compareEntries)
      } else if (updated.length === 0 && !hasRenames) {
        for (const id of survivingIds) {
          sortedEntries.push({ id, entity: currentEntities[id] })
        }
        for (const id of effectiveAdded) {
          insert(
            sortedEntries,
            { id, entity: currentEntities[id] },
            compareEntries,
          )
        }
      } else {
        const updatedSet = new Set<Id>(updated)
        let stillSorted = !hasRenames

        if (stillSorted) {
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
        }

        for (const id of survivingIds) {
          sortedEntries.push({ id, entity: currentEntities[id] })
        }

        if (!stillSorted) {
          sortedEntries.sort(compareEntries)
        }

        for (const id of effectiveAdded) {
          insert(
            sortedEntries,
            { id, entity: currentEntities[id] },
            compareEntries,
          )
        }
      }
    } catch (err) {
      for (const id of effectiveAdded) {
        delete (state.entities as Record<Id, T>)[id]
      }
      throw err
    }

    const newSortedIds = sortedEntries.map((entry) => entry.id)

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
    core.addMany(newEntities, state, undefined, (changes) =>
      applySortedChanges(state, changes),
    )
  }

  function setOneMutably(entity: T, state: R): void {
    applySortedChanges(state, core.setOne(entity, state), true)
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.setMany(
      newEntities,
      state,
      undefined,
      (changes) => applySortedChanges(state, changes, true),
      true,
    )
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.setAll(
      newEntities,
      state,
      (changes) => applySortedChanges(state, changes, true),
      true,
    )
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
    core.upsertOne(entity, state, (changes) =>
      applySortedChanges(state, changes),
    )
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.upsertMany(newEntities, state, (changes) =>
      applySortedChanges(state, changes),
    )
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
