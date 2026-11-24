import type {
  Comparer,
  EntityId,
  EntityState,
  EntityStateAdapter,
  IdSelector,
  RemoveManyFilter,
  Update,
} from '@reduxjs/toolkit'
import { createEntityAdapter, createNextState } from '@reduxjs/toolkit'
import { createEntityCore } from '../entity_core'
import type { DraftableEntityState } from '../models'
import { findInsertIndex, insert } from '../sorted_state_adapter'
import {
  createSingleArgumentStateOperator,
  createStateOperator,
} from '../state_adapter'
import {
  ensureEntitiesArray,
  getCurrent,
  isRemoveManyFilter,
  selectIdValue,
  splitAddedUpdatedEntities,
} from '../utils'

interface TestItem {
  id: string
  sortKey: number
  tag: string
  revision: number
}

const selectTestId: IdSelector<TestItem, string> = (item) => item.id
const sortByKeyThenId: Comparer<TestItem> = (a, b) =>
  a.sortKey - b.sortKey || a.id.localeCompare(b.id)

/**
 * Reference implementation of the pre-#5525 unsorted adapter so the
 * property-based differential suite can compare random operation sequences
 * against the historical behavior.
 */
function createReferenceUnsortedAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
): EntityStateAdapter<T, Id> {
  type R = DraftableEntityState<T, Id>

  function addOneMutably(entity: T, state: R): void {
    const key = selectIdValue(entity, selectId)
    if (key in state.entities) return
    state.ids.push(key as any)
    ;(state.entities as Record<Id, T>)[key] = entity
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    for (const entity of ensureEntitiesArray(newEntities)) {
      addOneMutably(entity, state)
    }
  }

  function setOneMutably(entity: T, state: R): void {
    const key = selectIdValue(entity, selectId)
    if (!(key in state.entities)) {
      state.ids.push(key as any)
    }
    ;(state.entities as Record<Id, T>)[key] = entity
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    for (const entity of ensureEntitiesArray(newEntities)) {
      setOneMutably(entity, state)
    }
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    state.ids = []
    state.entities = {} as Record<Id, T>
    setManyMutably(newEntities, state)
  }

  function selectMatchingIds(where: Partial<T>, state: R): Id[] {
    const ids = getCurrent(state.ids as Id[])
    const entities = getCurrent(state.entities as Record<Id, T>)
    const whereKeys = Object.keys(where) as (keyof T)[]
    if (whereKeys.length === 0) return []
    return ids.filter((id) => {
      const entity = entities[id]
      return whereKeys.every((key) => entity[key] === where[key])
    })
  }

  function removeManyMutably(
    keysOrFilter: readonly Id[] | RemoveManyFilter<T>,
    state: R,
  ): void {
    const keys = isRemoveManyFilter(keysOrFilter)
      ? selectMatchingIds(keysOrFilter.where, state)
      : keysOrFilter
    const removedIds = new Set<string>()
    for (const key of keys) {
      if (key in state.entities) {
        delete (state.entities as Record<Id, T>)[key]
        removedIds.add(String(key))
      }
    }
    if (removedIds.size > 0) {
      state.ids = getCurrent(state.ids as Id[]).filter(
        (id) => !removedIds.has(String(id)),
      ) as any
    }
  }

  function removeOneMutably(key: Id, state: R): void {
    removeManyMutably([key], state)
  }

  function removeAllMutably(state: R): void {
    Object.assign(state, { ids: [], entities: {} })
  }

  function takeNewKey(
    keys: { [id: string]: Id },
    update: Update<T, Id>,
    state: R,
  ): boolean {
    const original: T | undefined = (state.entities as Record<Id, T>)[update.id]
    if (original === undefined) return false
    const updated: T = Object.assign({}, original, update.changes)
    const newKey = selectIdValue(updated, selectId)
    const hasNewKey = newKey !== update.id
    if (hasNewKey) {
      keys[update.id] = newKey
      delete (state.entities as Record<Id, T>)[update.id]
    }
    ;(state.entities as Record<Id, T>)[newKey] = updated
    return hasNewKey
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
  ): void {
    const newKeys: { [id: string]: Id } = {}
    const updatesPerEntity: { [id: string]: Update<T, Id> } = {}
    updates.forEach((update) => {
      if (update.id in state.entities) {
        updatesPerEntity[update.id] = {
          id: update.id,
          changes: {
            ...updatesPerEntity[update.id]?.changes,
            ...update.changes,
          },
        }
      }
    })
    updates = Object.values(updatesPerEntity)
    if (updates.length > 0) {
      const didMutateIds =
        updates.filter((update) => takeNewKey(newKeys, update, state)).length >
        0
      if (didMutateIds) {
        const ids = new Set<Id>()
        for (const id of state.ids as Id[]) {
          const newId = newKeys[id] ?? id
          if (newId in state.entities) {
            ids.add(newId)
          }
        }
        state.ids = Array.from(ids)
      }
    }
  }

  function updateOneMutably(update: Update<T, Id>, state: R): void {
    updateManyMutably([update], state)
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    const [added, updated] = splitAddedUpdatedEntities<T, Id>(
      newEntities,
      selectId,
      state,
    )
    addManyMutably(added, state)
    updateManyMutably(updated, state)
  }

  function upsertOneMutably(entity: T, state: R): void {
    upsertManyMutably([entity], state)
  }

  return {
    removeAll: createSingleArgumentStateOperator(removeAllMutably),
    addOne: createStateOperator(addOneMutably),
    addMany: createStateOperator(addManyMutably),
    setOne: createStateOperator(setOneMutably),
    setMany: createStateOperator(setManyMutably),
    setAll: createStateOperator(setAllMutably),
    updateOne: createStateOperator(updateOneMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    upsertMany: createStateOperator(upsertManyMutably),
    removeOne: createStateOperator(removeOneMutably),
    removeMany: createStateOperator(removeManyMutably),
  }
}

/**
 * Reference implementation of the pre-#5525 sorted adapter.
 */
function createReferenceSortedAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
  comparer: Comparer<T>,
): EntityStateAdapter<T, Id> {
  type R = DraftableEntityState<T, Id>
  const { removeOne, removeMany, removeAll } =
    createReferenceUnsortedAdapter(selectId)

  function areArraysEqual(a: readonly unknown[], b: readonly unknown[]) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  function mergeFunction(
    state: R,
    addedItems: readonly T[],
    appliedUpdates?: boolean,
    replacedIds?: boolean,
  ): void {
    const currentEntities = getCurrent(state.entities)
    const currentIds = getCurrent(state.ids as Id[])
    const stateEntities = state.entities as Record<Id, T>

    let ids: Iterable<Id> = currentIds
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

    for (const item of addedItems) {
      stateEntities[selectId(item)] = item
      if (!wasPreviouslyEmpty) {
        insert(sortedEntities, item, comparer)
      }
    }

    if (wasPreviouslyEmpty) {
      sortedEntities = addedItems.slice().sort(comparer)
    } else if (appliedUpdates) {
      sortedEntities.sort(comparer)
    }

    const newSortedIds = sortedEntities.map(selectId)
    if (!areArraysEqual(currentIds, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
    existingIds?: Id[],
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    const existingKeys = new Set<Id>(
      existingIds ?? getCurrent(state.ids as Id[]),
    )
    const addedKeys = new Set<Id>()
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

  function addOneMutably(entity: T, state: R): void {
    addManyMutably([entity], state)
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    const deduplicatedEntities = {} as Record<Id, T>
    newEntities = ensureEntitiesArray(newEntities)
    if (newEntities.length !== 0) {
      for (const item of newEntities) {
        const entityId = selectId(item)
        deduplicatedEntities[entityId] = item
        delete (state.entities as Record<Id, T>)[entityId]
      }
      newEntities = ensureEntitiesArray(deduplicatedEntities)
      mergeFunction(state, newEntities)
    }
  }

  function setOneMutably(entity: T, state: R): void {
    setManyMutably([entity], state)
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    state.entities = {} as Record<Id, T>
    state.ids = []
    setManyMutably(newEntities, state)
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
  ): void {
    let appliedUpdates = false
    let replacedIds = false
    const updatesPerEntity: { [id: string]: Update<T, Id> } = {}
    for (const update of updates) {
      if (update.id in (state.entities as Record<Id, T>)) {
        updatesPerEntity[update.id] = {
          id: update.id,
          changes: {
            ...updatesPerEntity[update.id]?.changes,
            ...update.changes,
          },
        }
      }
    }
    for (const update of Object.values(updatesPerEntity) as Update<T, Id>[]) {
      const entity: T | undefined = (state.entities as Record<Id, T>)[update.id]
      if (!entity) continue
      appliedUpdates = true
      Object.assign(entity, update.changes)
      const newId = selectId(entity)
      if (update.id !== newId) {
        replacedIds = true
        delete (state.entities as Record<Id, T>)[update.id]
        const oldIndex = (state.ids as Id[]).indexOf(update.id)
        state.ids[oldIndex] = newId
        ;(state.entities as Record<Id, T>)[newId] = entity
      }
    }
    if (appliedUpdates) {
      mergeFunction(state, [], appliedUpdates, replacedIds)
    }
  }

  function updateOneMutably(update: Update<T, Id>, state: R): void {
    updateManyMutably([update], state)
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
    if (added.length) {
      addManyMutably(added, state, existingIdsArray)
    }
    if (updated.length) {
      updateManyMutably(updated, state)
    }
  }

  function upsertOneMutably(entity: T, state: R): void {
    upsertManyMutably([entity], state)
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

function createPrng(seed: number) {
  let state = seed >>> 0
  return {
    nextInt(maxExclusive: number): number {
      // xorshift32
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      return (state >>> 0) % maxExclusive
    },
  }
}

describe('Entity Adapter Shared Core & Property-Based Differential Tests (#5525)', () => {
  it('returns accurate EntityChangeRecord ({ added, updated, removed, renamed }) across operations', () => {
    const core = createEntityCore<TestItem, string>(selectTestId)
    const state: EntityState<TestItem, string> = { ids: [], entities: {} }

    const addChanges = core.addMany(
      [
        { id: 'a', sortKey: 2, tag: 'x', revision: 1 },
        { id: 'b', sortKey: 1, tag: 'y', revision: 1 },
        { id: 'a', sortKey: 99, tag: 'dup', revision: 2 },
      ],
      state,
    )
    state.ids.push(...addChanges.added)
    expect(addChanges).toEqual({
      added: ['a', 'b'],
      updated: [],
      removed: [],
      renamed: {},
    })

    const setChanges = core.setMany(
      [
        { id: 'b', sortKey: 10, tag: 'y', revision: 2 },
        { id: 'c', sortKey: 5, tag: 'z', revision: 1 },
        { id: 'c', sortKey: 6, tag: 'z', revision: 2 },
      ],
      state,
    )
    state.ids.push(...setChanges.added)
    expect(setChanges).toEqual({
      added: ['c'],
      updated: ['b'],
      removed: [],
      renamed: {},
      ordered: ['b', 'c'],
    })

    const updateChanges = core.updateMany(
      [
        { id: 'a', changes: { tag: 'x2' } },
        { id: 'b', changes: { id: 'd', sortKey: 3 } },
        { id: 'missing', changes: { tag: 'none' } },
      ],
      state,
    )
    expect(updateChanges).toEqual({
      added: [],
      updated: ['a', 'd'],
      removed: [],
      renamed: { b: 'd' },
    })
    expect(state.entities.a?.tag).toBe('x2')
    expect(state.entities.b).toBeUndefined()
    expect(state.entities.d).toEqual({
      id: 'd',
      sortKey: 3,
      tag: 'y',
      revision: 2,
    })
    state.ids = ['a', 'd', 'c']

    const upsertChanges = core.upsertMany(
      [
        { id: 'a', sortKey: 20, tag: 'x3', revision: 3 },
        { id: 'e', sortKey: 0, tag: 'new', revision: 1 },
      ],
      state,
    )
    state.ids.push(...upsertChanges.added)
    expect(upsertChanges).toEqual({
      added: ['e'],
      updated: ['a'],
      removed: [],
      renamed: {},
    })

    const removeChanges = core.removeMany(['c', 'missing'], state)
    expect(removeChanges).toEqual({
      added: [],
      updated: [],
      removed: ['c'],
      renamed: {},
    })
    state.ids = state.ids.filter((id) => id !== 'c')

    const setAllChanges = core.setAll(
      [{ id: 'a', sortKey: 1, tag: 'kept', revision: 4 }],
      state,
    )
    expect(setAllChanges).toEqual({
      added: ['a'],
      updated: [],
      removed: ['d', 'e'],
      renamed: {},
      ordered: ['a'],
    })
  })

  it('matches the reference unsorted and sorted adapters across 250 random operation sequences', () => {
    const idPool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const tagPool = ['alpha', 'beta', 'gamma', 'delta']

    const unsortedNew = createEntityAdapter({
      selectId: selectTestId,
    })
    const unsortedRef = createReferenceUnsortedAdapter<TestItem, string>(
      selectTestId,
    )

    const sortedNew = createEntityAdapter({
      selectId: selectTestId,
      sortComparer: sortByKeyThenId,
    })
    const sortedRef = createReferenceSortedAdapter<TestItem, string>(
      selectTestId,
      sortByKeyThenId,
    )

    for (let seed = 1; seed <= 250; seed++) {
      const rng = createPrng(seed * 7919)
      let rev = 0

      const makeEntity = (forcedId?: string): TestItem => ({
        id: forcedId ?? idPool[rng.nextInt(idPool.length)],
        sortKey: rng.nextInt(15) - 5,
        tag: tagPool[rng.nextInt(tagPool.length)],
        revision: ++rev,
      })

      const makeEntitiesBatch = (): TestItem[] => {
        const count = rng.nextInt(6)
        const list: TestItem[] = []
        for (let i = 0; i < count; i++) {
          list.push(makeEntity())
        }
        return list
      }

      let uNewState: EntityState<TestItem, string> = { ids: [], entities: {} }
      let uRefState: EntityState<TestItem, string> = { ids: [], entities: {} }
      let sNewState: EntityState<TestItem, string> = { ids: [], entities: {} }
      let sRefState: EntityState<TestItem, string> = { ids: [], entities: {} }

      const applyStep = (
        adapter: EntityStateAdapter<TestItem, string>,
        current: EntityState<TestItem, string>,
        opKind: number,
        payload: any,
        useImmerDraft: boolean,
      ): EntityState<TestItem, string> => {
        const run = (target: DraftableEntityState<TestItem, string>) => {
          switch (opKind) {
            case 0:
              return adapter.addOne(target, payload)
            case 1:
              return adapter.addMany(target, payload)
            case 2:
              return adapter.setOne(target, payload)
            case 3:
              return adapter.setMany(target, payload)
            case 4:
              return adapter.setAll(target, payload)
            case 5:
              return adapter.removeOne(target, payload)
            case 6:
              return adapter.removeMany(target, payload)
            case 7:
              return adapter.removeMany(target, payload)
            case 8:
              return adapter.removeAll(target)
            case 9:
              return adapter.updateOne(target, payload)
            case 10:
              return adapter.updateMany(target, payload)
            case 11:
              return adapter.upsertOne(target, payload)
            default:
              return adapter.upsertMany(target, payload)
          }
        }

        if (useImmerDraft) {
          return createNextState(current, (draft) => {
            run(draft)
          })
        }
        return run(current)
      }

      for (let step = 0; step < 30; step++) {
        const opKind = rng.nextInt(13)
        const useImmerDraft = rng.nextInt(2) === 1
        let payload: any

        switch (opKind) {
          case 0:
          case 2:
          case 11:
            payload = makeEntity()
            break
          case 1:
          case 3:
          case 4:
          case 12:
            payload = makeEntitiesBatch()
            break
          case 5:
            payload = idPool[rng.nextInt(idPool.length)]
            break
          case 6: {
            const count = rng.nextInt(5)
            const keys: string[] = []
            for (let i = 0; i < count; i++) {
              keys.push(idPool[rng.nextInt(idPool.length)])
            }
            payload = keys
            break
          }
          case 7:
            payload = {
              where:
                rng.nextInt(4) === 0
                  ? {}
                  : { tag: tagPool[rng.nextInt(tagPool.length)] },
            }
            break
          case 8:
            payload = undefined
            break
          case 9: {
            const id = idPool[rng.nextInt(idPool.length)]
            const rename = rng.nextInt(4) === 0
            const newId = rename ? idPool[rng.nextInt(idPool.length)] : id
            payload = {
              id,
              changes: {
                ...(rename ? { id: newId } : {}),
                sortKey: rng.nextInt(15) - 5,
                tag: tagPool[rng.nextInt(tagPool.length)],
                revision: ++rev,
              },
            } satisfies Update<TestItem, string>
            break
          }
          case 10: {
            const count = rng.nextInt(4)
            const updates: Update<TestItem, string>[] = []
            const usedNewIds = new Set<string>()
            for (let i = 0; i < count; i++) {
              const id = idPool[rng.nextInt(idPool.length)]
              // Avoid chained a->b + b->c in the same batch where reference sorted adapter had an indexOf bug
              const wantsRename = rng.nextInt(4) === 0
              const candidateId = wantsRename
                ? idPool[rng.nextInt(idPool.length)]
                : id
              const canRename =
                wantsRename &&
                !usedNewIds.has(id) &&
                !usedNewIds.has(candidateId)
              const newId = canRename ? candidateId : id
              usedNewIds.add(id)
              usedNewIds.add(newId)
              updates.push({
                id,
                changes: {
                  ...(canRename ? { id: newId } : {}),
                  sortKey: rng.nextInt(15) - 5,
                  tag: tagPool[rng.nextInt(tagPool.length)],
                  revision: ++rev,
                },
              })
            }
            payload = updates
            break
          }
        }

        uNewState = applyStep(
          unsortedNew,
          uNewState,
          opKind,
          payload,
          useImmerDraft,
        )
        uRefState = applyStep(
          unsortedRef,
          uRefState,
          opKind,
          payload,
          useImmerDraft,
        )
        expect(uNewState).toEqual(uRefState)

        sNewState = applyStep(
          sortedNew,
          sNewState,
          opKind,
          payload,
          useImmerDraft,
        )
        sRefState = applyStep(
          sortedRef,
          sRefState,
          opKind,
          payload,
          useImmerDraft,
        )
        expect(sNewState).toEqual(sRefState)
      }
    }
  })

  it('keeps findInsertIndex exported and consistent', () => {
    const items = [{ v: 1 }, { v: 3 }, { v: 5 }]
    expect(findInsertIndex(items, { v: 4 }, (a, b) => a.v - b.v)).toBe(2)
  })

  it('handles chained and swapped ID renames consistently across unsorted and sorted adapters', () => {
    const unsorted = createEntityAdapter({ selectId: selectTestId })
    const sorted = createEntityAdapter({
      selectId: selectTestId,
      sortComparer: sortByKeyThenId,
    })

    const initialItems: TestItem[] = [
      { id: 'a', sortKey: 10, tag: 'first', revision: 1 },
      { id: 'b', sortKey: 20, tag: 'second', revision: 1 },
    ]

    // Chained rename in one batch: a -> b and b -> c
    const uChained = unsorted.updateMany(
      unsorted.getInitialState(undefined, initialItems),
      [
        { id: 'a', changes: { id: 'b', sortKey: 30 } },
        { id: 'b', changes: { id: 'c', sortKey: 5 } },
      ],
    )
    const sChained = sorted.updateMany(
      sorted.getInitialState(undefined, initialItems),
      [
        { id: 'a', changes: { id: 'b', sortKey: 30 } },
        { id: 'b', changes: { id: 'c', sortKey: 5 } },
      ],
    )

    expect(uChained.ids).toEqual(['b', 'c'])
    expect(sChained.ids).toEqual(['c', 'b'])
    expect(uChained.entities).toEqual(sChained.entities)
    expect(uChained.entities).toEqual({
      b: { id: 'b', sortKey: 30, tag: 'first', revision: 1 },
      c: { id: 'c', sortKey: 5, tag: 'second', revision: 1 },
    })

    // Swapped IDs in one batch: a -> b and b -> a
    const uSwapped = unsorted.updateMany(
      unsorted.getInitialState(undefined, initialItems),
      [
        { id: 'a', changes: { id: 'b' } },
        { id: 'b', changes: { id: 'a' } },
      ],
    )
    const sSwapped = sorted.updateMany(
      sorted.getInitialState(undefined, initialItems),
      [
        { id: 'a', changes: { id: 'b' } },
        { id: 'b', changes: { id: 'a' } },
      ],
    )

    expect(uSwapped.ids).toEqual(['b', 'a'])
    expect(sSwapped.ids).toEqual(['b', 'a'])
    expect(uSwapped.entities).toEqual(sSwapped.entities)
    expect(uSwapped.entities).toEqual({
      b: { id: 'b', sortKey: 10, tag: 'first', revision: 1 },
      a: { id: 'a', sortKey: 20, tag: 'second', revision: 1 },
    })
  })

  it('reorders updated items in O(k log N) comparisons via binary reinsertion instead of O(N) full re-sort', () => {
    let comparisons = 0
    const sorted = createEntityAdapter<TestItem>({
      sortComparer: (a, b) => {
        comparisons += 1
        return a.sortKey - b.sortKey
      },
    })

    const initialItems: TestItem[] = Array.from({ length: 2000 }, (_, i) => ({
      id: `item-${i}`,
      sortKey: i * 10,
      tag: 'initial',
      revision: 1,
    }))

    const state = sorted.getInitialState(undefined, initialItems)

    // 1. Updating a non-sort field checks only immediate neighbors (2 comparisons)
    comparisons = 0
    const afterInPlaceUpdate = sorted.updateOne(state, {
      id: 'item-1000',
      changes: { tag: 'touched' },
    })
    expect(comparisons).toBe(2)
    expect(afterInPlaceUpdate.ids).toBe(state.ids)

    // 2. Adding one item into a 2,000-element list uses binary insertion (< 30 comparisons)
    comparisons = 0
    const afterAddOne = sorted.addOne(state, {
      id: 'item-new',
      sortKey: 10005,
      tag: 'added',
      revision: 1,
    })
    expect(comparisons).toBeLessThan(30)
    expect(afterAddOne.ids[1001]).toBe('item-new')
  })

  it('handles Object.prototype keys like constructor, live draft references, partial selectId failures, and tied set/upsert ordering', () => {
    const unsorted = createEntityAdapter({ selectId: selectTestId })
    const sorted = createEntityAdapter({
      selectId: selectTestId,
      sortComparer: (a, b) => a.sortKey - b.sortKey,
    })

    // 1. Object.prototype key ('constructor') on empty state for addOne and setOne
    const ctorItem: TestItem = {
      id: 'constructor',
      sortKey: 1,
      tag: 'proto',
      revision: 1,
    }
    expect(unsorted.addOne(unsorted.getInitialState(), ctorItem).ids).toEqual([
      'constructor',
    ])
    expect(sorted.addOne(sorted.getInitialState(), ctorItem).ids).toEqual([
      'constructor',
    ])
    expect(unsorted.setOne(unsorted.getInitialState(), ctorItem).ids).toEqual([
      'constructor',
    ])
    expect(sorted.setOne(sorted.getInitialState(), ctorItem).ids).toEqual([
      'constructor',
    ])

    // 2. Preserve live entity draft references on sorted in-place updateOne
    const initialWithA = sorted.getInitialState(undefined, [
      { id: 'a', sortKey: 1, tag: 'init', revision: 1 },
    ])
    const afterDraftMutation = createNextState(initialWithA, (draft) => {
      const retainedRef = draft.entities.a!
      sorted.updateOne(draft, { id: 'a', changes: { tag: 'updated' } })
      retainedRef.revision = 99
    })
    expect(afterDraftMutation.entities.a).toEqual({
      id: 'a',
      sortKey: 1,
      tag: 'updated',
      revision: 99,
    })

    // 3. Partial selectId failure in addMany indexes the committed prefix, and in updateMany is atomic
    const strictAdapter = createEntityAdapter({
      selectId: (item: TestItem) => {
        if (!item.id) throw new Error('missing id')
        return item.id
      },
      sortComparer: (a: TestItem, b: TestItem) => a.sortKey - b.sortKey,
    })
    const afterCaughtAddMany = createNextState(
      strictAdapter.getInitialState(),
      (draft) => {
        try {
          strictAdapter.addMany(draft, [
            { id: 'valid-1', sortKey: 1, tag: 'ok', revision: 1 },
            { id: '', sortKey: 2, tag: 'bad', revision: 1 },
          ])
        } catch {
          // caught inside producer
        }
      },
    )
    expect(afterCaughtAddMany.ids).toEqual(['valid-1'])
    expect(afterCaughtAddMany.entities['valid-1']?.tag).toBe('ok')

    const initialForUpdateMany = strictAdapter.getInitialState(undefined, [
      { id: 'valid-1', sortKey: 1, tag: 'ok-1', revision: 1 },
      { id: 'valid-2', sortKey: 2, tag: 'ok-2', revision: 1 },
    ])
    let updateManyThrew = false
    const afterCaughtUpdateMany = createNextState(
      initialForUpdateMany,
      (draft) => {
        try {
          strictAdapter.updateMany(draft, [
            { id: 'valid-1', changes: { id: 'renamed-1' } },
            { id: 'valid-2', changes: { id: '' } },
          ])
        } catch {
          updateManyThrew = true
        }
      },
    )
    expect(updateManyThrew).toBe(true)
    expect(afterCaughtUpdateMany.ids).toEqual(['valid-1', 'valid-2'])
    expect(afterCaughtUpdateMany.entities['valid-1']?.id).toBe('valid-1')
    expect(afterCaughtUpdateMany.entities['valid-2']?.id).toBe('valid-2')
    expect(afterCaughtUpdateMany.entities['renamed-1']).toBeUndefined()

    // 4. Deduplicate destination keys across rename and addition in upsertMany
    interface PrefixedItem {
      id?: string
      prefix?: string
      rank: number
    }
    const prefixedAdapter = createEntityAdapter<PrefixedItem, string>({
      selectId: (e) => (e.prefix ?? '') + (e.id ?? ''),
      sortComparer: (a, b) => a.rank - b.rank,
    })
    const startPrefixed = prefixedAdapter.getInitialState(undefined, [
      { id: 'a', rank: 1 },
    ])
    const afterPrefixedUpsert = prefixedAdapter.upsertMany(startPrefixed, [
      { id: 'aa', rank: 2 },
      { prefix: 'a', rank: 3 },
    ])
    expect(afterPrefixedUpsert.ids).toEqual(['aa'])
    expect(afterPrefixedUpsert.entities.aa).toEqual({
      id: 'a',
      prefix: 'a',
      rank: 3,
    })
    expect(
      Object.prototype.hasOwnProperty.call(afterPrefixedUpsert.entities, 'a'),
    ).toBe(false)

    // 5. Preserve pre-update rank tie order in sorted upsertMany
    const startTieUpsert = sorted.getInitialState(undefined, [
      { id: 'a', sortKey: 10, tag: 'old', revision: 1 },
    ])
    const afterTieUpsert = sorted.upsertMany(startTieUpsert, [
      { id: 'b', sortKey: 0, tag: 'new', revision: 1 },
      { id: 'a', sortKey: 0, tag: 'updated', revision: 2 },
    ])
    expect(afterTieUpsert.ids).toEqual(['b', 'a'])

    // 6. Preserve sorted setOne and setAll tie order
    const startSetTie = sorted.getInitialState(undefined, [
      { id: 'a', sortKey: 0, tag: 'first', revision: 1 },
      { id: 'b', sortKey: 0, tag: 'second', revision: 1 },
    ])
    const afterSetOneTie = sorted.setOne(startSetTie, {
      id: 'a',
      sortKey: 0,
      tag: 'replaced',
      revision: 2,
    })
    expect(afterSetOneTie.ids).toEqual(['b', 'a'])

    const afterSetAllNumericTie = sorted.setAll(sorted.getInitialState(), [
      { id: '2', sortKey: 0, tag: 'two', revision: 1 },
      { id: '1', sortKey: 0, tag: 'one', revision: 1 },
    ])
    expect(afterSetAllNumericTie.ids).toEqual(['1', '2'])
  })
})
