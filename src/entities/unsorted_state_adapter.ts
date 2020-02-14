import {
  EntityState,
  EntityStateAdapter,
  IdSelector,
  Update,
  EntityMap
} from './models'
import { createStateOperator } from './state_adapter'
import { selectIdValue } from './utils'

export function createUnsortedStateAdapter<T>(
  selectId: IdSelector<T>
): EntityStateAdapter<T>
export function createUnsortedStateAdapter<T>(selectId: IdSelector<T>): any {
  type R = EntityState<T>

  function addOneMutably(entity: T, state: R): void
  function addOneMutably(entity: any, state: any): void {
    const key = selectIdValue(entity, selectId)

    if (key in state.entities) {
      return
    }

    state.ids.push(key)
    state.entities[key] = entity
  }

  function addManyMutably(entities: T[], state: R): void
  function addManyMutably(entities: any[], state: any): void {
    for (const entity of entities) {
      addOneMutably(entity, state)
    }
  }

  function setAllMutably(entities: T[], state: R): void
  function setAllMutably(entities: any[], state: any): void {
    state.ids = []
    state.entities = {}

    addManyMutably(entities, state)
  }

  function removeOneMutably(key: T, state: R): void
  function removeOneMutably(key: any, state: any): void {
    return removeManyMutably([key], state)
  }

  function removeManyMutably(keys: any[], state: R): void {
    let didMutate = false

    keys.forEach(key => {
      if (key in state.entities) {
        delete state.entities[key]
        didMutate = true
      }
    })

    if (didMutate) {
      state.ids = state.ids.filter(id => id in state.entities)
    }
  }

  function removeAll<S extends R>(state: S): S
  function removeAll<S extends R>(state: any): S {
    return Object.assign({}, state, {
      ids: [],
      entities: {}
    })
  }

  function takeNewKey(
    keys: { [id: string]: string },
    update: Update<T>,
    state: R
  ): void
  function takeNewKey(
    keys: { [id: string]: any },
    update: Update<T>,
    state: any
  ): boolean {
    const original = state.entities[update.id]
    const updated: T = Object.assign({}, original, update.changes)
    const newKey = selectIdValue(updated, selectId)
    const hasNewKey = newKey !== update.id

    if (hasNewKey) {
      keys[update.id] = newKey
      delete state.entities[update.id]
    }

    state.entities[newKey] = updated

    return hasNewKey
  }

  function updateOneMutably(update: Update<T>, state: R): void
  function updateOneMutably(update: any, state: any): void {
    return updateManyMutably([update], state)
  }

  function updateManyMutably(updates: Update<T>[], state: R): void
  function updateManyMutably(updates: any[], state: any): void {
    const newKeys: { [id: string]: string } = {}

    updates = updates.filter(update => update.id in state.entities)

    const didMutateEntities = updates.length > 0

    if (didMutateEntities) {
      const didMutateIds =
        updates.filter(update => takeNewKey(newKeys, update, state)).length > 0

      if (didMutateIds) {
        state.ids = state.ids.map((id: any) => newKeys[id] || id)
      }
    }
  }

  function mapMutably(map: EntityMap<T>, state: R): void
  function mapMutably(map: any, state: any): void {
    const changes: Update<T>[] = state.ids.reduce(
      (changes: any[], id: string | number) => {
        const change = map(state.entities[id])
        if (change !== state.entities[id]) {
          changes.push({ id, changes: change })
        }
        return changes
      },
      []
    )
    const updates = changes.filter(({ id }) => id in state.entities)

    return updateManyMutably(updates, state)
  }

  function upsertOneMutably(entity: T, state: R): void
  function upsertOneMutably(entity: any, state: any): void {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(entities: T[], state: R): void
  function upsertManyMutably(entities: any[], state: any): void {
    const added: any[] = []
    const updated: any[] = []

    for (const entity of entities) {
      const id = selectIdValue(entity, selectId)
      if (id in state.entities) {
        updated.push({ id, changes: entity })
      } else {
        added.push(entity)
      }
    }

    updateManyMutably(updated, state)
    addManyMutably(added, state)
  }

  return {
    removeAll,
    addOne: createStateOperator(addOneMutably),
    addMany: createStateOperator(addManyMutably),
    setAll: createStateOperator(setAllMutably),
    updateOne: createStateOperator(updateOneMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    upsertMany: createStateOperator(upsertManyMutably),
    removeOne: createStateOperator(removeOneMutably),
    removeMany: createStateOperator(removeManyMutably),
    map: createStateOperator(mapMutably)
  }
}
