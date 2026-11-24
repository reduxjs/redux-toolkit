import { isDraft } from '../immerImports'
import type {
  DraftableEntityState,
  EntityId,
  IdSelector,
  RemoveManyFilter,
  Update,
} from './models'
import {
  ensureEntitiesArray,
  getCurrent,
  isRemoveManyFilter,
  selectIdValue,
  splitAddedUpdatedEntities,
} from './utils'

export interface EntityChangeRecord<Id extends EntityId> {
  added: Id[]
  updated: Id[]
  removed: Id[]
  renamed: Record<Id, Id>
}

export function hasOwnEntity(record: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

export function createEmptyChangeRecord<
  Id extends EntityId,
>(): EntityChangeRecord<Id> {
  return {
    added: [],
    updated: [],
    removed: [],
    renamed: Object.create(null) as Record<Id, Id>,
  }
}

export function createEntityCore<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
) {
  type R = DraftableEntityState<T, Id>

  function addOne(
    entity: T,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
  ): EntityChangeRecord<Id> {
    const key = selectIdValue(entity, selectId)

    if (hasOwnEntity(state.entities, key)) {
      return changes
    }

    ;(state.entities as Record<Id, T>)[key] = entity
    changes.added.push(key)
    return changes
  }

  function addMany(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
    onCommit?: (committed: EntityChangeRecord<Id>) => void,
  ): EntityChangeRecord<Id> {
    const entities = ensureEntitiesArray(newEntities)
    try {
      for (const entity of entities) {
        addOne(entity, state, changes)
      }
    } finally {
      if (onCommit && changes.added.length > 0) {
        onCommit(changes)
      }
    }
    return changes
  }

  function setOne(
    entity: T,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
  ): EntityChangeRecord<Id> {
    const key = selectIdValue(entity, selectId)
    const existedBefore = hasOwnEntity(state.entities, key)
    ;(state.entities as Record<Id, T>)[key] = entity

    if (!existedBefore) {
      changes.added.push(key)
    } else if (!changes.added.includes(key) && !changes.updated.includes(key)) {
      changes.updated.push(key)
    }

    return changes
  }

  function setMany(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
    onCommit?: (committed: EntityChangeRecord<Id>) => void,
    enumerateDeduplicatedKeys: boolean = false,
  ): EntityChangeRecord<Id> {
    const entities = ensureEntitiesArray(newEntities)
    if (entities.length === 0) {
      return changes
    }

    const seenAdded = new Set<Id>(changes.added)
    const seenUpdated = new Set<Id>(changes.updated)

    try {
      if (enumerateDeduplicatedKeys) {
        const deduplicated: Record<Id, T> = {} as Record<Id, T>
        const keyByString: Record<string, Id> = Object.create(null)
        for (const entity of entities) {
          const key = selectIdValue(entity, selectId)
          deduplicated[key] = entity
          keyByString[String(key)] = key
        }
        for (const strKey of Object.keys(deduplicated)) {
          const key = keyByString[strKey]
          const entity = deduplicated[key]
          const existedBefore =
            hasOwnEntity(state.entities, key) && !seenAdded.has(key)
          ;(state.entities as Record<Id, T>)[key] = entity

          if (existedBefore) {
            if (!seenUpdated.has(key)) {
              seenUpdated.add(key)
              changes.updated.push(key)
            }
          } else if (!seenAdded.has(key)) {
            seenAdded.add(key)
            changes.added.push(key)
          }
        }
      } else {
        for (const entity of entities) {
          const key = selectIdValue(entity, selectId)
          const existedBefore =
            hasOwnEntity(state.entities, key) && !seenAdded.has(key)
          ;(state.entities as Record<Id, T>)[key] = entity

          if (existedBefore) {
            if (!seenUpdated.has(key)) {
              seenUpdated.add(key)
              changes.updated.push(key)
            }
          } else if (!seenAdded.has(key)) {
            seenAdded.add(key)
            changes.added.push(key)
          }
        }
      }
    } finally {
      if (
        onCommit &&
        (changes.added.length > 0 || changes.updated.length > 0)
      ) {
        onCommit(changes)
      }
    }

    return changes
  }

  function setAll(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
    onCommit?: (committed: EntityChangeRecord<Id>) => void,
    enumerateDeduplicatedKeys: boolean = false,
  ): EntityChangeRecord<Id> {
    const changes = createEmptyChangeRecord<Id>()
    const currentIds = getCurrent(state.ids as Id[])

    state.ids = []
    state.entities = {} as Record<Id, T>

    setMany(newEntities, state, changes, undefined, enumerateDeduplicatedKeys)

    if (currentIds.length > 0) {
      const addedSet = new Set<string>(changes.added.map(String))
      for (const id of currentIds) {
        if (!addedSet.has(String(id))) {
          changes.removed.push(id)
        }
      }
    }

    if (onCommit) {
      onCommit(changes)
    }

    return changes
  }

  function selectMatchingIds(where: Partial<T>, state: R): Id[] {
    const ids = getCurrent(state.ids as Id[])
    const entities = getCurrent(state.entities as Record<Id, T>)
    const whereKeys = Object.keys(where) as (keyof T)[]
    if (whereKeys.length === 0) {
      return []
    }

    return ids.filter((id) => {
      const entity = entities[id]
      return whereKeys.every((key) => entity[key] === where[key])
    })
  }

  function removeOne(key: Id, state: R): EntityChangeRecord<Id> {
    return removeMany([key], state)
  }

  function removeMany(
    keysOrFilter: readonly Id[] | RemoveManyFilter<T>,
    state: R,
  ): EntityChangeRecord<Id> {
    const changes = createEmptyChangeRecord<Id>()
    const keys = isRemoveManyFilter(keysOrFilter)
      ? selectMatchingIds(keysOrFilter.where, state)
      : keysOrFilter
    // `entities` keys are strings, so compare ids as strings too
    const removedIds = new Set<string>()

    for (const key of keys) {
      if (hasOwnEntity(state.entities, key)) {
        delete (state.entities as Record<Id, T>)[key]
        removedIds.add(String(key))
      }
    }

    if (removedIds.size > 0) {
      for (const id of getCurrent(state.ids as Id[])) {
        if (removedIds.has(String(id))) {
          changes.removed.push(id)
        }
      }
    }

    return changes
  }

  function removeAll(state: R): EntityChangeRecord<Id> {
    Object.assign(state, {
      ids: [],
      entities: {},
    })

    return createEmptyChangeRecord<Id>()
  }

  function updateOne(update: Update<T, Id>, state: R): EntityChangeRecord<Id> {
    return updateMany([update], state)
  }

  function updateMany(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
  ): EntityChangeRecord<Id> {
    const updatesPerEntity: Record<Id, Update<T, Id>> = Object.create(null)

    for (const update of updates) {
      // Only apply updates to entities that currently exist
      if (hasOwnEntity(state.entities, update.id)) {
        // If there are multiple updates to one entity, merge them together
        updatesPerEntity[update.id] = {
          id: update.id,
          // Spreads ignore falsy values, so this works even if there isn't
          // an existing update already at this key
          changes: {
            ...updatesPerEntity[update.id]?.changes,
            ...update.changes,
          },
        }
      }
    }

    const mergedUpdates: Array<Update<T, Id>> = Object.values(updatesPerEntity)
    if (mergedUpdates.length === 0) {
      return changes
    }

    // Pass 1: stage all candidate updates and evaluate selectIdValue before
    // mutating state.entities or any draft entity so a throwing selectId
    // cannot leave earlier updates or renames partially applied.
    const preparedUpdates: Array<{
      oldKey: Id
      newKey: Id
      updateChanges: Partial<T>
      original: T
      candidate: T
    }> = []

    for (const update of mergedUpdates) {
      const original: T | undefined = (state.entities as Record<Id, T>)[
        update.id
      ]
      if (original === undefined) {
        continue
      }

      const candidate: T = Object.assign({}, original, update.changes)
      const newKey = selectIdValue(candidate, selectId)

      preparedUpdates.push({
        oldKey: update.id,
        newKey,
        updateChanges: update.changes,
        original,
        candidate,
      })
    }

    const seenAdded = new Set<Id>(changes.added)
    const seenUpdated = new Set<Id>(changes.updated)

    // Pass 2: delete old keys for all renamed entities first so chained or
    // swapped renames in the same batch never delete a newly written entity.
    for (const { oldKey, newKey } of preparedUpdates) {
      if (newKey !== oldKey) {
        delete (state.entities as Record<Id, T>)[oldKey]
        if (seenAdded.has(oldKey)) {
          seenAdded.delete(oldKey)
          const idx = changes.added.indexOf(oldKey)
          if (idx !== -1) {
            if (
              !seenAdded.has(newKey) &&
              !hasOwnEntity(state.entities, newKey)
            ) {
              changes.added[idx] = newKey
              seenAdded.add(newKey)
            } else {
              changes.added.splice(idx, 1)
            }
          }
        } else {
          changes.renamed[oldKey] = newKey
          if (seenAdded.has(newKey)) {
            seenAdded.delete(newKey)
            const idx = changes.added.indexOf(newKey)
            if (idx !== -1) {
              changes.added.splice(idx, 1)
            }
          }
        }
      }
    }

    // Pass 3: apply updates. For in-place updates on an Immer draft that keep
    // the same ID, mutate the existing draft entity in place to preserve live
    // draft references held by the caller.
    for (const {
      oldKey,
      newKey,
      updateChanges,
      original,
      candidate,
    } of preparedUpdates) {
      if (newKey === oldKey && isDraft(original)) {
        Object.assign(original as object, updateChanges)
        ;(state.entities as Record<Id, T>)[newKey] = original
      } else {
        ;(state.entities as Record<Id, T>)[newKey] = candidate
      }

      if (!seenAdded.has(newKey) && !seenUpdated.has(newKey)) {
        seenUpdated.add(newKey)
        changes.updated.push(newKey)
      }
    }

    return changes
  }

  function upsertOne(
    entity: T,
    state: R,
    onPhase?: (phaseChanges: EntityChangeRecord<Id>) => void,
  ): EntityChangeRecord<Id> {
    return upsertMany([entity], state, onPhase)
  }

  function upsertMany(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
    onPhase?: (phaseChanges: EntityChangeRecord<Id>) => void,
  ): EntityChangeRecord<Id> {
    const [added, updated] = splitAddedUpdatedEntities<T, Id>(
      newEntities,
      selectId,
      state,
    )

    if (onPhase) {
      const combined = createEmptyChangeRecord<Id>()
      if (added.length > 0) {
        const addChanges = addMany(added, state, undefined, onPhase)
        combined.added.push(...addChanges.added)
      }
      if (updated.length > 0) {
        const updateChanges = updateMany(updated, state)
        onPhase(updateChanges)
        for (const [oldId, newId] of Object.entries(
          updateChanges.renamed,
        ) as Array<[Id, Id]>) {
          const addedIdx = combined.added.indexOf(oldId)
          if (addedIdx !== -1) {
            if (!combined.added.includes(newId)) {
              combined.added[addedIdx] = newId
            } else {
              combined.added.splice(addedIdx, 1)
            }
          } else {
            combined.renamed[oldId] = newId
            const targetAddedIdx = combined.added.indexOf(newId)
            if (targetAddedIdx !== -1) {
              combined.added.splice(targetAddedIdx, 1)
            }
          }
        }
        for (const id of updateChanges.updated) {
          if (!combined.added.includes(id) && !combined.updated.includes(id)) {
            combined.updated.push(id)
          }
        }
      }
      return combined
    }

    const changes = createEmptyChangeRecord<Id>()
    if (added.length > 0) {
      addMany(added, state, changes)
    }
    if (updated.length > 0) {
      updateMany(updated, state, changes)
    }

    return changes
  }

  return {
    addOne,
    addMany,
    setOne,
    setMany,
    setAll,
    removeOne,
    removeMany,
    removeAll,
    updateOne,
    updateMany,
    upsertOne,
    upsertMany,
  }
}
