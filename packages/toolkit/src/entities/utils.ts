import type { Draft } from '../immerImports'
import { current, isDraft } from '../immerImports'
import type {
  DraftableEntityState,
  EntityId,
  IdSelector,
  Update,
} from './models'

export function selectIdValue<T, EntityIdType extends EntityId>(
  entity: T,
  selectId: IdSelector<T, EntityIdType>,
) {
  const key = selectId(entity)

  if (process.env.NODE_ENV !== 'production' && key === undefined) {
    console.warn(
      'The entity passed to the `selectId` implementation returned undefined.',
      'You should probably provide your own `selectId` implementation.',
      'The entity that was passed:',
      entity,
      'The `selectId` implementation:',
      selectId.toString(),
    )
  }

  return key
}

export function ensureEntitiesArray<T, EntityIdType extends EntityId>(
  entities: readonly T[] | Record<EntityIdType, T>,
): readonly T[] {
  if (!Array.isArray(entities)) {
    return Object.values(entities)
  }

  return entities
}

export function getCurrent<T>(value: T | Draft<T>): T {
  return (isDraft(value) ? current(value as Draft<T>) : value) as T
}

export function splitAddedUpdatedEntities<T, EntityIdType extends EntityId>(
  newEntities: readonly T[] | Record<EntityIdType, T>,
  selectId: IdSelector<T, EntityIdType>,
  state: DraftableEntityState<T, EntityIdType>,
): [T[], Update<T, EntityIdType>[], EntityIdType[]] {
  newEntities = ensureEntitiesArray(newEntities)

  const existingIdsArray = getCurrent<EntityIdType[]>(state.ids)
  const existingIds = new Set<EntityIdType>(existingIdsArray)

  const added: T[] = []
  const addedIds = new Set<EntityIdType>([])
  const updated: Update<T, EntityIdType>[] = []

  for (const entity of newEntities) {
    const id = selectIdValue(entity, selectId)
    if (existingIds.has(id) || addedIds.has(id)) {
      updated.push({ id, changes: entity })
    } else {
      addedIds.add(id)
      added.push(entity)
    }
  }
  return [added, updated, existingIdsArray]
}
