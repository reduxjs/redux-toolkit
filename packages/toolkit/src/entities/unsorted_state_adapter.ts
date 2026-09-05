import type { Draft } from '../immerImports'
import type {
  DraftableEntityState,
  EntityId,
  EntityStateAdapter,
  IdSelector,
  Update,
} from './models'
import {
  createSingleArgumentStateOperator,
  createStateOperator,
} from './state_adapter'
import {
  ensureEntitiesArray,
  selectIdValue,
  splitAddedUpdatedEntities,
} from './utils'

export function createUnsortedStateAdapter<T, EntityIdType extends EntityId>(
  selectId: IdSelector<T, EntityIdType>,
): EntityStateAdapter<T, EntityIdType> {
  type R = DraftableEntityState<T, EntityIdType>

  function addOneMutably(entity: T, state: R): void {
    const key = selectIdValue(entity, selectId)

    if (key in (state.entities as Record<EntityIdType, T>)) {
      return
    }

    state.ids.push(key as EntityIdType & Draft<EntityIdType>)
    ;(state.entities as Record<EntityIdType, T>)[key] = entity
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)

    for (const entity of newEntities) {
      addOneMutably(entity, state)
    }
  }

  function setOneMutably(entity: T, state: R): void {
    const key = selectIdValue(entity, selectId)
    if (!(key in (state.entities as Record<EntityIdType, T>))) {
      state.ids.push(key as EntityIdType & Draft<EntityIdType>)
    }
    ;(state.entities as Record<EntityIdType, T>)[key] = entity
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)
    for (const entity of newEntities) {
      setOneMutably(entity, state)
    }
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    newEntities = ensureEntitiesArray(newEntities)

    state.ids = []
    state.entities = {} as Record<EntityIdType, T>

    setManyMutably(newEntities, state)
  }

  function removeOneMutably(key: EntityIdType, state: R): void {
    return removeManyMutably([key], state)
  }

  function removeManyMutably(keys: readonly EntityIdType[], state: R): void {
    let didMutate = false

    keys.forEach((key) => {
      if (key in (state.entities as Record<EntityIdType, T>)) {
        delete (state.entities as Record<EntityIdType, T>)[key]
        didMutate = true
      }
    })

    if (didMutate) {
      state.ids = (state.ids as EntityIdType[]).filter(
        (id) => id in (state.entities as Record<EntityIdType, T>),
      ) as EntityIdType[] | Draft<EntityIdType[]>
    }
  }

  function removeAllMutably(state: R): void {
    Object.assign(state, {
      ids: [],
      entities: {},
    })
  }

  function takeNewKey(
    keys: { [id: string]: EntityIdType },
    update: Update<T, EntityIdType>,
    state: R,
  ): boolean {
    const original: T | undefined = (state.entities as Record<EntityIdType, T>)[
      update.id
    ]
    if (original === undefined) {
      return false
    }
    const updated: T = Object.assign({}, original, update.changes)
    const newKey = selectIdValue(updated, selectId)
    const hasNewKey = newKey !== update.id

    if (hasNewKey) {
      keys[update.id] = newKey
      delete (state.entities as Record<EntityIdType, T>)[update.id]
    }

    ;(state.entities as Record<EntityIdType, T>)[newKey] = updated

    return hasNewKey
  }

  function updateOneMutably(update: Update<T, EntityIdType>, state: R): void {
    return updateManyMutably([update], state)
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, EntityIdType>>,
    state: R,
  ): void {
    const newKeys: { [id: string]: EntityIdType } = {}

    const updatesPerEntity: { [id: string]: Update<T, EntityIdType> } = {}

    updates.forEach((update) => {
      // Only apply updates to entities that currently exist
      if (update.id in (state.entities as Record<EntityIdType, T>)) {
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
    })

    updates = Object.values(updatesPerEntity)

    const didMutateEntities = updates.length > 0

    if (didMutateEntities) {
      const didMutateIds =
        updates.filter((update) => takeNewKey(newKeys, update, state)).length >
        0

      if (didMutateIds) {
        state.ids = Object.values(
          state.entities as Record<EntityIdType, T>,
        ).map((e) => selectIdValue(e as T, selectId))
      }
    }
  }

  function upsertOneMutably(entity: T, state: R): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<EntityIdType, T>,
    state: R,
  ): void {
    const [added, updated] = splitAddedUpdatedEntities<T, EntityIdType>(
      newEntities,
      selectId,
      state,
    )

    addManyMutably(added, state)
    updateManyMutably(updated, state)
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
