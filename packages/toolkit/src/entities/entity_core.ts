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

export function createEmptyChangeRecord<
  Id extends EntityId,
>(): EntityChangeRecord<Id> {
  return {
    added: [],
    updated: [],
    removed: [],
    renamed: {} as Record<Id, Id>,
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

    if (key in state.entities) {
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
  ): EntityChangeRecord<Id> {
    for (const entity of ensureEntitiesArray(newEntities)) {
      addOne(entity, state, changes)
    }
    return changes
  }

  function setOne(
    entity: T,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
  ): EntityChangeRecord<Id> {
    const key = selectIdValue(entity, selectId)
    const existedBefore = key in state.entities
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
  ): EntityChangeRecord<Id> {
    const entities = ensureEntitiesArray(newEntities)
    if (entities.length === 0) {
      return changes
    }

    const seenAdded = new Set<Id>(changes.added)
    const seenUpdated = new Set<Id>(changes.updated)

    for (const entity of entities) {
      const key = selectIdValue(entity, selectId)
      const existedBefore = key in state.entities && !seenAdded.has(key)
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

    return changes
  }

  function setAll(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): EntityChangeRecord<Id> {
    const changes = createEmptyChangeRecord<Id>()
    const currentIds = getCurrent(state.ids as Id[])

    state.ids = []
    state.entities = {} as Record<Id, T>

    setMany(newEntities, state, changes)

    if (currentIds.length > 0) {
      const addedSet = new Set<string>(changes.added.map(String))
      for (const id of currentIds) {
        if (!addedSet.has(String(id))) {
          changes.removed.push(id)
        }
      }
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
      if (key in state.entities) {
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
    const changes = createEmptyChangeRecord<Id>()
    const currentIds = getCurrent(state.ids as Id[])
    if (currentIds.length > 0) {
      changes.removed.push(...currentIds)
    }

    Object.assign(state, {
      ids: [],
      entities: {},
    })

    return changes
  }

  function updateOne(update: Update<T, Id>, state: R): EntityChangeRecord<Id> {
    return updateMany([update], state)
  }

  function updateMany(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
    changes: EntityChangeRecord<Id> = createEmptyChangeRecord(),
  ): EntityChangeRecord<Id> {
    const updatesPerEntity: { [id: string]: Update<T, Id> } = {}

    for (const update of updates) {
      // Only apply updates to entities that currently exist
      if (update.id in state.entities) {
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

    const mergedUpdates = Object.values(updatesPerEntity)
    if (mergedUpdates.length === 0) {
      return changes
    }

    const seenAdded = new Set<Id>(changes.added)
    const seenUpdated = new Set<Id>(changes.updated)
    const preparedUpdates: Array<{ newKey: Id; updated: T }> = []

    for (const update of mergedUpdates) {
      const original: T | undefined = (state.entities as Record<Id, T>)[
        update.id
      ]
      if (original === undefined) {
        continue
      }

      const updated: T = Object.assign({}, original, update.changes)
      const newKey = selectIdValue(updated, selectId)

      if (newKey !== update.id) {
        changes.renamed[update.id] = newKey
        delete (state.entities as Record<Id, T>)[update.id]
      }

      preparedUpdates.push({ newKey, updated })
    }

    for (const { newKey, updated } of preparedUpdates) {
      ;(state.entities as Record<Id, T>)[newKey] = updated

      if (!seenAdded.has(newKey) && !seenUpdated.has(newKey)) {
        seenUpdated.add(newKey)
        changes.updated.push(newKey)
      }
    }

    return changes
  }

  function upsertOne(entity: T, state: R): EntityChangeRecord<Id> {
    return upsertMany([entity], state)
  }

  function upsertMany(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): EntityChangeRecord<Id> {
    const changes = createEmptyChangeRecord<Id>()
    const [added, updated] = splitAddedUpdatedEntities<T, Id>(
      newEntities,
      selectId,
      state,
    )

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
