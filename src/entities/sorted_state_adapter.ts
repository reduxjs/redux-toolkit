import {
  EntityState,
  IdSelector,
  Comparer,
  EntityStateAdapter,
  Update,
  EntityMap
} from './models'
import { createStateOperator, DidMutate } from './state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'
import { selectIdValue } from './utils'

export function createSortedStateAdapter<T>(
  selectId: IdSelector<T>,
  sort: Comparer<T>
): EntityStateAdapter<T>
export function createSortedStateAdapter<T>(selectId: any, sort: any): any {
  type R = EntityState<T>

  const { removeOne, removeMany, removeAll } = createUnsortedStateAdapter(
    selectId
  )

  function addOneMutably(entity: T, state: R): DidMutate
  function addOneMutably(entity: any, state: any): DidMutate {
    return addManyMutably([entity], state)
  }

  function addManyMutably(newModels: T[], state: R): DidMutate
  function addManyMutably(newModels: any[], state: any): DidMutate {
    const models = newModels.filter(
      model => !(selectIdValue(model, selectId) in state.entities)
    )

    if (models.length === 0) {
      return DidMutate.None
    } else {
      merge(models, state)
      return DidMutate.Both
    }
  }

  function setAllMutably(models: T[], state: R): DidMutate
  function setAllMutably(models: any[], state: any): DidMutate {
    state.entities = {}
    state.ids = []

    addManyMutably(models, state)

    return DidMutate.Both
  }

  function updateOneMutably(update: Update<T>, state: R): DidMutate
  function updateOneMutably(update: any, state: any): DidMutate {
    return updateManyMutably([update], state)
  }

  function takeUpdatedModel(models: T[], update: Update<T>, state: R): boolean
  function takeUpdatedModel(models: any[], update: any, state: any): boolean {
    if (!(update.id in state.entities)) {
      return false
    }

    const original = state.entities[update.id]
    const updated = Object.assign({}, original, update.changes)
    const newKey = selectIdValue(updated, selectId)

    delete state.entities[update.id]

    models.push(updated)

    return newKey !== update.id
  }

  function updateManyMutably(updates: Update<T>[], state: R): DidMutate
  function updateManyMutably(updates: any[], state: any): DidMutate {
    const models: T[] = []

    const didMutateIds =
      updates.filter(update => takeUpdatedModel(models, update, state)).length >
      0

    if (models.length === 0) {
      return DidMutate.None
    } else {
      const originalIds = state.ids
      const updatedIndexes: any[] = []
      state.ids = state.ids.filter((id: any, index: number) => {
        if (id in state.entities) {
          return true
        } else {
          updatedIndexes.push(index)
          return false
        }
      })

      merge(models, state)

      if (
        !didMutateIds &&
        updatedIndexes.every((i: number) => state.ids[i] === originalIds[i])
      ) {
        return DidMutate.EntitiesOnly
      } else {
        return DidMutate.Both
      }
    }
  }

  function mapMutably(map: EntityMap<T>, state: R): DidMutate
  function mapMutably(updatesOrMap: any, state: any): DidMutate {
    const updates: Update<T>[] = state.ids.reduce(
      (changes: any[], id: string | number) => {
        const change = updatesOrMap(state.entities[id])
        if (change !== state.entities[id]) {
          changes.push({ id, changes: change })
        }
        return changes
      },
      []
    )

    return updateManyMutably(updates, state)
  }

  function upsertOneMutably(entity: T, state: R): DidMutate
  function upsertOneMutably(entity: any, state: any): DidMutate {
    return upsertManyMutably([entity], state)
  }

  function upsertManyMutably(entities: T[], state: R): DidMutate
  function upsertManyMutably(entities: any[], state: any): DidMutate {
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

    const didMutateByUpdated = updateManyMutably(updated, state)
    const didMutateByAdded = addManyMutably(added, state)

    switch (true) {
      case didMutateByAdded === DidMutate.None &&
        didMutateByUpdated === DidMutate.None:
        return DidMutate.None
      case didMutateByAdded === DidMutate.Both ||
        didMutateByUpdated === DidMutate.Both:
        return DidMutate.Both
      default:
        return DidMutate.EntitiesOnly
    }
  }

  function merge(models: T[], state: R): void
  function merge(models: any[], state: any): void {
    models.sort(sort)

    const ids: any[] = []

    let i = 0
    let j = 0

    while (i < models.length && j < state.ids.length) {
      const model = models[i]
      const modelId = selectIdValue(model, selectId)
      const entityId = state.ids[j]
      const entity = state.entities[entityId]

      if (sort(model, entity) <= 0) {
        ids.push(modelId)
        i++
      } else {
        ids.push(entityId)
        j++
      }
    }

    if (i < models.length) {
      state.ids = ids.concat(models.slice(i).map(selectId))
    } else {
      state.ids = ids.concat(state.ids.slice(j))
    }

    models.forEach(model => {
      state.entities[selectId(model)] = model
    })
  }

  return {
    removeOne,
    removeMany,
    removeAll,
    addOne: createStateOperator(addOneMutably),
    updateOne: createStateOperator(updateOneMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    setAll: createStateOperator(setAllMutably),
    addMany: createStateOperator(addManyMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertMany: createStateOperator(upsertManyMutably),
    map: createStateOperator(mapMutably)
  }
}
