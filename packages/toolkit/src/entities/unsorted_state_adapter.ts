import type { Draft } from '../draftTypes'
import type { EntityChangeRecord } from './entity_core'
import { createEntityCore, hasOwnEntity } from './entity_core'
import type {
  EntityStateAdapter,
  IdSelector,
  Update,
  EntityId,
  DraftableEntityState,
  RemoveManyFilter,
} from './models'
import {
  createStateOperator,
  createSingleArgumentStateOperator,
} from './state_adapter'
import { getCurrent } from './utils'

export function createUnsortedStateAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
): EntityStateAdapter<T, Id> {
  type R = DraftableEntityState<T, Id>

  const core = createEntityCore<T, Id>(selectId)

  function applyUnsortedChanges(
    state: R,
    changes: EntityChangeRecord<Id>,
  ): void {
    const { added, removed, renamed } = changes

    if (removed.length > 0 && state.ids.length > 0) {
      const removedIds = new Set<string>(removed.map(String))
      state.ids = getCurrent(state.ids as Id[]).filter(
        (id) => !removedIds.has(String(id)),
      ) as Id[] | Draft<Id[]>
    }

    if (added.length > 0) {
      for (const key of added) {
        state.ids.push(key as Id & Draft<Id>)
      }
    }

    if (Object.keys(renamed).length > 0) {
      // Swap each renamed ID in place to keep the existing order. Renaming
      // onto an ID that is already in use leaves only one entry for it.
      const ids = new Set<Id>()
      for (const id of state.ids as Id[]) {
        const newId = hasOwnEntity(renamed, id) ? renamed[id] : id
        if (hasOwnEntity(state.entities, newId)) {
          ids.add(newId)
        }
      }
      state.ids = Array.from(ids)
    }
  }

  function addOneMutably(entity: T, state: R): void {
    applyUnsortedChanges(state, core.addOne(entity, state))
  }

  function addManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.addMany(newEntities, state, undefined, (changes) =>
      applyUnsortedChanges(state, changes),
    )
  }

  function setOneMutably(entity: T, state: R): void {
    applyUnsortedChanges(state, core.setOne(entity, state))
  }

  function setManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.setMany(newEntities, state, undefined, (changes) =>
      applyUnsortedChanges(state, changes),
    )
  }

  function setAllMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.setAll(newEntities, state, (changes) =>
      applyUnsortedChanges(state, changes),
    )
  }

  function removeOneMutably(key: Id, state: R): void {
    applyUnsortedChanges(state, core.removeOne(key, state))
  }

  function removeManyMutably(
    keysOrFilter: readonly Id[] | RemoveManyFilter<T>,
    state: R,
  ): void {
    applyUnsortedChanges(state, core.removeMany(keysOrFilter, state))
  }

  function removeAllMutably(state: R): void {
    core.removeAll(state)
  }

  function updateOneMutably(update: Update<T, Id>, state: R): void {
    applyUnsortedChanges(state, core.updateOne(update, state))
  }

  function updateManyMutably(
    updates: ReadonlyArray<Update<T, Id>>,
    state: R,
  ): void {
    applyUnsortedChanges(state, core.updateMany(updates, state))
  }

  function upsertOneMutably(entity: T, state: R): void {
    core.upsertOne(entity, state, (changes) =>
      applyUnsortedChanges(state, changes),
    )
  }

  function upsertManyMutably(
    newEntities: readonly T[] | Record<Id, T>,
    state: R,
  ): void {
    core.upsertMany(newEntities, state, (changes) =>
      applyUnsortedChanges(state, changes),
    )
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
