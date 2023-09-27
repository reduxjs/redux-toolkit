import type { IdSelector, Update, EntityId, DraftableEntityState } from './models'

export function selectIdValue<T, Id extends EntityId>(
  entity: T,
  selectId: IdSelector<T, Id>
) {
  const key = selectId(entity)

  if (process.env.NODE_ENV !== 'production' && key === undefined) {
    console.warn(
      'The entity passed to the `selectId` implementation returned undefined.',
      'You should probably provide your own `selectId` implementation.',
      'The entity that was passed:',
      entity,
      'The `selectId` implementation:',
      selectId.toString()
    )
  }

  return key
}

export function ensureEntitiesArray<T, Id extends EntityId>(
  entities: readonly T[] | Record<Id, T>
): readonly T[] {
  if (!Array.isArray(entities)) {
    entities = Object.values(entities)
  }

  return entities
}

export function splitAddedUpdatedEntities<T, Id extends EntityId>(
  newEntities: readonly T[] | Record<Id, T>,
  selectId: IdSelector<T, Id>,
  state: DraftableEntityState<T, Id>
): [T[], Update<T, Id>[]] {
  newEntities = ensureEntitiesArray(newEntities)

  const added: T[] = []
  const updated: Update<T, Id>[] = []

  for (const entity of newEntities) {
    const id = selectIdValue(entity, selectId)
    if (id in state.entities) {
      updated.push({ id, changes: entity })
    } else {
      added.push(entity)
    }
  }
  return [added, updated]
}
