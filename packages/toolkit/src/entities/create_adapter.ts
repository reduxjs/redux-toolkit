import type { WithRequiredProp } from '../tsHelpers'
import { createInitialStateFactory } from './entity_state'
import type { EntityAdapter, EntityAdapterOptions, EntityId } from './models'
import { createSortedStateAdapter } from './sorted_state_adapter'
import { createSelectorsFactory } from './state_selectors'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'

export function createEntityAdapter<T, Id extends EntityId>(
  options: WithRequiredProp<EntityAdapterOptions<T, Id>, 'selectId'>,
): EntityAdapter<T, Id>

export function createEntityAdapter<T extends { id: EntityId }>(
  options?: Omit<EntityAdapterOptions<T, T['id']>, 'selectId'>,
): EntityAdapter<T, T['id']>

/**
 *
 * @param options
 *
 * @public
 */
export function createEntityAdapter<T>(
  options: EntityAdapterOptions<T, EntityId> = {},
): EntityAdapter<T, EntityId> {
  const {
    selectId,
    sortComparer,
  }: Required<EntityAdapterOptions<T, EntityId>> = {
    sortComparer: false,
    selectId: (instance: any) => instance.id,
    ...options,
  }

  const stateAdapter = sortComparer
    ? createSortedStateAdapter(selectId, sortComparer)
    : createUnsortedStateAdapter(selectId)
  const stateFactory = createInitialStateFactory(stateAdapter)
  const selectorsFactory = createSelectorsFactory<T, EntityId>()

  return {
    selectId,
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter,
  }
}
