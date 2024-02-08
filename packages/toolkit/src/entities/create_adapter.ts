import { createInitialStateFactory } from './entity_state'
import type {
  Comparer,
  EntityAdapter,
  EntityDefinition,
  EntityId,
  IdSelector,
} from './models'
import { createSortedStateAdapter } from './sorted_state_adapter'
import { createSelectorsFactory } from './state_selectors'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'

export interface EntityAdapterOptions<T, Id extends EntityId> {
  selectId?: IdSelector<T, Id>
  sortComparer?: false | Comparer<T>
}

export function createEntityAdapter<T, Id extends EntityId>(options: {
  selectId: IdSelector<T, Id>
  sortComparer?: false | Comparer<T>
}): EntityAdapter<T, Id>

export function createEntityAdapter<T extends { id: EntityId }>(options?: {
  sortComparer?: false | Comparer<T>
}): EntityAdapter<T, T['id']>

/**
 *
 * @param options
 *
 * @public
 */
export function createEntityAdapter<T>(
  options: {
    selectId?: IdSelector<T, EntityId>
    sortComparer?: false | Comparer<T>
  } = {},
): EntityAdapter<T, EntityId> {
  const { selectId, sortComparer }: EntityDefinition<T, EntityId> = {
    sortComparer: false,
    selectId: (instance: any) => instance.id,
    ...options,
  }

  const stateFactory = createInitialStateFactory<T, EntityId>()
  const selectorsFactory = createSelectorsFactory<T, EntityId>()
  const stateAdapter = sortComparer
    ? createSortedStateAdapter(selectId, sortComparer)
    : createUnsortedStateAdapter(selectId)

  return {
    selectId,
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter,
  }
}
