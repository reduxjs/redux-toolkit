import type { WithRequiredProp } from '../tsHelpers'
import { createInitialStateFactory } from './entity_state'
import type { EntityAdapter, EntityAdapterOptions, EntityId } from './models'
import { createSortedStateAdapter } from './sorted_state_adapter'
import { createSelectorsFactory } from './state_selectors'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'

export function createEntityAdapter<EntityType, EntityIdType extends EntityId>(
  options: WithRequiredProp<
    EntityAdapterOptions<EntityType, EntityIdType>,
    'selectId'
  >,
): EntityAdapter<EntityType, EntityIdType>

export function createEntityAdapter<EntityType extends { id: EntityId }>(
  options?: Omit<
    EntityAdapterOptions<EntityType, EntityType['id']>,
    'selectId'
  >,
): EntityAdapter<EntityType, EntityType['id']>

/**
 *
 * @param options
 *
 * @public
 */
export function createEntityAdapter<EntityType>(
  options: EntityAdapterOptions<EntityType, EntityId> = {},
): EntityAdapter<EntityType, EntityId> {
  const {
    selectId,
    sortComparer,
  }: Required<EntityAdapterOptions<EntityType, EntityId>> = {
    sortComparer: false,
    selectId: (instance: any) => instance.id,
    ...options,
  }

  const stateAdapter = sortComparer
    ? createSortedStateAdapter(selectId, sortComparer)
    : createUnsortedStateAdapter(selectId)
  const stateFactory = createInitialStateFactory(stateAdapter)
  const selectorsFactory = createSelectorsFactory<EntityType, EntityId>()

  return {
    selectId,
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter,
  }
}
