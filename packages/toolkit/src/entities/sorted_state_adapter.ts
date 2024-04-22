import { current, isDraft } from 'immer'
import type {
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityId,
  DraftableEntityState,
} from './models'
import { createStateOperator } from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import {
  selectIdValue,
  ensureEntitiesArray,
  splitAddedUpdatedEntities,
  getCurrent,
} from './utils'

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
    // console.log('Res: ', item, currentItem, res)
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

  const { removeOne, removeMany, removeAll } =
    createUnsortedStateAdapter(selectId)

  function addOneMutably(entity: T, state: R): void {
    return addManyMutably([entity], state)
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
    existingIds?: Id[],
  ): void {
    newEntities = ensureEntitiesArray(newEntities)

    const existingKeys = new Set<Id>(
      existingIds ?? (current(state.ids) as Id[]),
    )

    const models = newEntities.filter(
      // (model) => !(selectId(model) in state.entities),
      (model) => !existingKeys.has(selectIdValue(model, selectId)),
    )

    if (models.length !== 0) {
      mergeFunction(state, models)
    }
  }

  function setOneMutably(entity: T, state: R): void {
    return setManyMutably([entity], state)
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    if (newEntities.length !== 0) {
      //const updatedIds = new Set<Id>(newEntities.map((item) => selectId(item)))
      for (const item of newEntities) {
        delete (state.entities as Record<Id, T>)[selectId(item)]
      }
      mergeFunction(state, newEntities)
    }
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    state.entities = {} as Record<Id, T>
    state.ids = []

    addManyMutably(newEntities, state, [])
  }

  function updateOneMutably(update: Update<T, Id>, state: R): void {
    return updateManyMutably([update], state)
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
  ): void {
    let appliedUpdates = false
    let replacedIds = false
    const updatedIds = new Set<Id>()

    for (let update of updates) {
      const entity: T | undefined = (state.entities as Record<Id, T>)[update.id]
      if (!entity) {
        continue
      }

      appliedUpdates = true

      Object.assign(entity, update.changes)
      const newId = selectId(entity)
      updatedIds.add(newId)
      if (update.id !== newId) {
        replacedIds = true
        delete (state.entities as Record<Id, T>)[update.id]
        updatedIds.delete(update.id)
        const oldIndex = (state.ids as Id[]).indexOf(update.id)
        state.ids[oldIndex] = newId
        ;(state.entities as Record<Id, T>)[newId] = entity
      }
    }

    if (appliedUpdates) {
      mergeFunction(state, [], updatedIds, replacedIds)
      // resortEntities(state, [], replacedIds)
    }
  }

  function upsertOneMutably(entity: T, state: R): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    const [added, updated, existingIdsArray] = splitAddedUpdatedEntities<T, Id>(
      newEntities,
      selectId,
      state,
    )

    if (updated.length) {
      updateManyMutably(updated, state)
    }
    if (added.length) {
      addManyMutably(added, state, existingIdsArray)
    }
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

    resortEntities(state, models)
  }

  function cleanItem(item: T) {
    return isDraft(item) ? current(item) : item
  }

  type MergeFunction = (
    state: R,
    addedItems: readonly T[],
    updatedIds?: Set<Id>,
    replacedIds?: boolean,
  ) => void

  // const mergeFunction: MergeFunction = (state, addedItems) => {
  //   const actualMergeFunction: MergeFunction = mergeOriginal
  //   console.log('Merge function: ', actualMergeFunction.name)
  //   actualMergeFunction(state, addedItems)
  // }

  const mergeOriginal: MergeFunction = (state, addedItems) => {
    // Insert/overwrite all new/updated
    addedItems.forEach((model) => {
      ;(state.entities as Record<Id, T>)[selectId(model)] = model
    })
    resortEntities(state)

    function resortEntities(state: R) {
      const allEntities = Object.values(state.entities) as T[]
      allEntities.sort(comparer)
      const newSortedIds = allEntities.map(selectId)
      const { ids } = state
      if (!areArraysEqual(ids, newSortedIds)) {
        state.ids = newSortedIds
      }
    }
  }

  const mergeLenz: MergeFunction = (
    state,
    addedItems: readonly T[],
    updatedIds,
    replacedIds,
  ) => {
    const entities = state.entities as Record<Id, T>
    let ids = state.ids as Id[]
    if (replacedIds) {
      ids = Array.from(new Set(ids))
    }
    const oldEntities = ids // Array.from(new Set(state.ids as Id[]))
      .map((id) => entities[id])
      .filter(Boolean)

    let newSortedIds: Id[] = []
    const seenIds = new Set<Id>()

    if (addedItems.length) {
      const newEntities = addedItems.slice().sort(comparer)

      // Insert/overwrite all new/updated
      newEntities.forEach((model) => {
        entities[selectId(model)] = model
      })

      let o = 0,
        n = 0
      while (o < oldEntities.length && n < newEntities.length) {
        const oldEntity = oldEntities[o] as T,
          oldId = selectId(oldEntity),
          newEntity = newEntities[n],
          newId = selectId(newEntity)

        if (seenIds.has(newId)) {
          n++
          continue
        }

        const comparison = comparer(oldEntity, newEntity)
        if (comparison < 0) {
          // Sort the existing item first
          newSortedIds.push(oldId)
          seenIds.add(oldId)
          o++
          continue
        }

        if (comparison > 0) {
          // Sort the new item first
          newSortedIds.push(newId)
          seenIds.add(newId)
          n++
          continue
        }
        // The items are equivalent. Maintain stable sorting by
        // putting the existing  item first.
        newSortedIds.push(oldId)
        seenIds.add(oldId)
        o++
        newSortedIds.push(newId)
        seenIds.add(newId)
        n++
      }
      // Add any remaining existing items
      while (o < oldEntities.length) {
        newSortedIds.push(selectId(oldEntities[o]))
        o++
      }
      // Add any remaining new items
      while (n < newEntities.length) {
        newSortedIds.push(selectId(newEntities[n]))
        n++
      }
    } else if (updatedIds) {
      oldEntities.sort(comparer)
      newSortedIds = oldEntities.map(selectId)
    }

    if (!areArraysEqual(state.ids, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  const mergeInsertion: MergeFunction = (
    state,
    addedItems,
    updatedIds,
    replacedIds,
  ) => {
    const currentEntities = getCurrent(state.entities) as Record<Id, T>
    const currentIds = getCurrent(state.ids) as Id[]
    // const entities = state.entities as Record<Id, T>
    const stateEntities = state.entities as Record<Id, T>
    // let ids = state.ids as Id[]
    let ids = currentIds
    if (replacedIds) {
      ids = Array.from(new Set(currentIds))
    }

    // //let sortedEntities: T[] = []

    // let sortedEntities = ids // Array.from(new Set(state.ids as Id[]))
    //   .map((id) => entities[id])
    //   .filter(Boolean)

    // if (addedItems.length) {
    //   if (wasPreviouslyEmpty) {
    //     sortedEntities = addedItems.slice().sort()
    //   }

    //   for (const item of addedItems) {
    //     entities[selectId(item)] = item
    //     if (!wasPreviouslyEmpty) {
    //       insert(sortedEntities, item, sort)
    //     }
    //   }
    // }
    let sortedEntities: T[] = []
    for (const id of ids) {
      const entity = currentEntities[id]
      if (entity) {
        sortedEntities.push(entity)
      }
    }
    // let sortedEntities = ids // Array.from(new Set(state.ids as Id[]))
    //   .map((id) => currentEntities[id])
    //   .filter(Boolean)

    const wasPreviouslyEmpty = sortedEntities.length === 0

    // let oldIds = state.ids as Id[]
    // // if (updatedIds) {
    // //   oldIds = oldIds.filter((id) => !updatedIds.has(id))
    // //   const updatedItems = Array.from(updatedIds)
    // //     .map((id) => entities[id])
    // //     .filter(Boolean)
    // //   models = updatedItems.concat(models)
    // // }
    // // console.log('Old IDs: ', oldIds)
    // const sortedEntities = oldIds
    //   .map((id) => (state.entities as Record<Id, T>)[id as Id])
    //   .filter(Boolean)

    // Insert/overwrite all new/updated
    for (const item of addedItems) {
      stateEntities[selectId(item)] = item
      // console.log('Inserting: ', isDraft(item) ? current(item) : item)
      if (!wasPreviouslyEmpty) {
        insert(sortedEntities, item, comparer)
      }
    }

    if (wasPreviouslyEmpty) {
      sortedEntities = addedItems.slice().sort(comparer)
    } else if (updatedIds?.size) {
      for (const updatedId of updatedIds) {
        const item: T = currentEntities[updatedId]
        // const currentIndex = sortedEntities.indexOf(item)
        // const newIndex = findInsertIndex(sortedEntities, item, comparer)
        // console.log('Item: ', updatedId, { currentIndex, newIndex })
      }
      sortedEntities.sort(comparer)
    }

    const newSortedIds = sortedEntities.map(selectId)
    // console.log('New sorted IDs: ', newSortedIds)
    if (!areArraysEqual(currentIds, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  const mergeInitialPR: MergeFunction = (
    state,
    addedItems,
    updatedIds,
    replacedIds,
  ) => {
    // Insert/overwrite all new/updated
    addedItems.forEach((model) => {
      ;(state.entities as Record<Id, T>)[selectId(model)] = model
    })

    let allEntities: T[]

    if (replacedIds) {
      // This is a really annoying edge case. Just figure this out from scratch
      // rather than try to be clever. This will be more expensive since it isn't sorted right.
      allEntities = Object.values(state.entities) as T[]
    } else {
      // We're starting with an already-sorted list.
      let existingIds = state.ids

      if (addedItems.length) {
        // There's a couple edge cases where we can have duplicate item IDs.
        // Ensure we don't have duplicates.
        const uniqueIds = new Set(existingIds as Id[])

        addedItems.forEach((item) => {
          uniqueIds.add(selectId(item))
        })
        existingIds = Array.from(uniqueIds)
      }

      // By this point `ids` and `entities` should be 1:1, but not necessarily sorted.
      // Make this a sorta-mostly-sorted array.
      allEntities = existingIds.map(
        (id) => (state.entities as Record<Id, T>)[id as Id],
      )
    }

    // Now when we sort, things should be _close_ already, and fewer comparisons are needed.
    allEntities.sort(comparer)

    const newSortedIds = allEntities.map(selectId)
    const { ids } = state

    if (!areArraysEqual(ids, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  const mergeTweakedPR: MergeFunction = (
    state,
    addedItems,
    updatedIds,
    replacedIds,
  ) => {
    let allEntities: T[]

    let existingIds = state.ids
    const uniqueIds = new Set(existingIds as Id[])
    existingIds = Array.from(uniqueIds)

    if (addedItems.length) {
      // There's a couple edge cases where we can have duplicate item IDs.
      // Ensure we don't have duplicates.

      addedItems.forEach((item) => {
        ;(state.entities as Record<Id, T>)[selectId(item)] = item
        uniqueIds.add(selectId(item))
      })
      existingIds = Array.from(uniqueIds)
    }

    // By this point `ids` and `entities` should be 1:1, but not necessarily sorted.
    // Make this a sorta-mostly-sorted array.
    allEntities = existingIds.map(
      (id) => (state.entities as Record<Id, T>)[id as Id],
    )

    // if (replacedIds) {
    //     // There's a couple edge cases where we can have duplicate item IDs.
    //     // Ensure we don't have duplicates.
    //     const uniqueIds = new Set(existingIds as Id[])
    //   // This is a really annoying edge case. Just figure this out from scratch
    //   // rather than try to be clever. This will be more expensive since it isn't sorted right.
    //   allEntities = state.ids.map(
    //     (id) => (state.entities as Record<Id, T>)[id as Id],
    //   )
    // } else {
    //   // We're starting with an already-sorted list.
    //   let existingIds = state.ids

    //   if (addedItems.length) {
    //     // There's a couple edge cases where we can have duplicate item IDs.
    //     // Ensure we don't have duplicates.
    //     const uniqueIds = new Set(existingIds as Id[])

    //     addedItems.forEach((item) => {

    //       ;(state.entities as Record<Id, T>)[selectId(item)] = item
    //       uniqueIds.add(selectId(item))
    //     })
    //     existingIds = Array.from(uniqueIds)
    //   }

    //   // By this point `ids` and `entities` should be 1:1, but not necessarily sorted.
    //   // Make this a sorta-mostly-sorted array.
    //   allEntities = existingIds.map(
    //     (id) => (state.entities as Record<Id, T>)[id as Id],
    //   )
    // }

    // Now when we sort, things should be _close_ already, and fewer comparisons are needed.
    allEntities.sort(comparer)

    const newSortedIds = allEntities.map(selectId)
    const { ids } = state

    if (!areArraysEqual(ids, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  const mergeJackman: MergeFunction = (
    state,
    addedItems,
    updatedIds,
    replacedIds,
  ) => {
    const entities = state.entities as Record<Id, T>
    let ids = state.ids as Id[]
    if (replacedIds) {
      ids = Array.from(new Set(ids))
    }
    const existingSortedItems = ids // Array.from(new Set(state.ids as Id[]))
      .map((id) => entities[id])
      .filter(Boolean)

    function findInsertIndex2<T>(
      sortedItems: T[],
      item: T,
      comparisonFunction: Comparer<T>,
      lowIndexOverride?: number,
    ): number {
      let lowIndex = lowIndexOverride ?? 0
      let highIndex = sortedItems.length
      while (lowIndex < highIndex) {
        const middleIndex = (lowIndex + highIndex) >>> 1
        const currentItem = sortedItems[middleIndex]
        if (comparisonFunction(item, currentItem) > 0) {
          lowIndex = middleIndex + 1
        } else {
          highIndex = middleIndex
        }
      }

      return lowIndex
    }

    if (addedItems.length) {
      const newEntities = addedItems.slice().sort(comparer)

      // Insert/overwrite all new/updated
      newEntities.forEach((model) => {
        entities[selectId(model)] = model
      })

      const firstInstanceId = newEntities[0]
      const lastInstanceId = newEntities[newEntities.length - 1]

      const startIndex = findInsertIndex2(
        existingSortedItems,
        firstInstanceId,
        comparer,
      )
      const endIndex = findInsertIndex2(
        existingSortedItems,
        lastInstanceId,
        comparer,
        startIndex,
      )

      const overlappingExistingIds = existingSortedItems.slice(
        startIndex,
        endIndex,
      )
      let newIdIndexOfLastInsert = 0
      let lastRelativeInsertIndex = 0
      for (let i = 1; i < newEntities.length; i++) {
        const relativeInsertIndex = findInsertIndex2(
          overlappingExistingIds,
          newEntities[i],
          comparer,
          lastRelativeInsertIndex,
        )
        if (lastRelativeInsertIndex !== relativeInsertIndex) {
          const insertIndex =
            startIndex + newIdIndexOfLastInsert + lastRelativeInsertIndex
          const arrayToInsert = newEntities.slice(newIdIndexOfLastInsert, i)
          existingSortedItems.splice(insertIndex, 0, ...arrayToInsert)
          newIdIndexOfLastInsert = i
          lastRelativeInsertIndex = relativeInsertIndex
        }
      }
      existingSortedItems.splice(
        startIndex + newIdIndexOfLastInsert + lastRelativeInsertIndex,
        0,
        ...newEntities.slice(newIdIndexOfLastInsert),
      )
    } else if (updatedIds?.size) {
      existingSortedItems.sort(comparer)
    }

    const newSortedIds = existingSortedItems.map(selectId)

    if (!areArraysEqual(ids, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  const mergeFunction: MergeFunction = mergeInsertion

  function resortEntities(
    state: R,
    addedItems: readonly T[] = [],
    replacedIds = false,
  ) {
    let allEntities: T[]

    allEntities = Object.values(state.entities) as T[]
    if (replacedIds) {
      // This is a really annoying edge case. Just figure this out from scratch
      // rather than try to be clever. This will be more expensive since it isn't sorted right.
      allEntities = Object.values(state.entities) as T[]
    } else {
      // We're starting with an already-sorted list.
      let existingIds = state.ids

      if (addedItems.length) {
        // There's a couple edge cases where we can have duplicate item IDs.
        // Ensure we don't have duplicates.
        const uniqueIds = new Set(existingIds as Id[])

        addedItems.forEach((item) => {
          uniqueIds.add(selectId(item))
        })
        existingIds = Array.from(uniqueIds)
      }

      // By this point `ids` and `entities` should be 1:1, but not necessarily sorted.
      // Make this a sorta-mostly-sorted array.
      allEntities = existingIds.map(
        (id) => (state.entities as Record<Id, T>)[id as Id],
      )
    }

    // Now when we sort, things should be _close_ already, and fewer comparisons are needed.
    allEntities.sort(comparer)

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
