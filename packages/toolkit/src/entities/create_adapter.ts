import type {
  EntityDefinition,
  Comparer,
  IdSelector,
  EntityAdapter,
  EntityId,
} from './models'
import { createInitialStateFactory } from './entity_state'
import { createSelectorsFactory } from './state_selectors'
import { createSortedStateAdapter } from './sorted_state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'

type ExtractEntityId<T extends { id: EntityId }> = T extends { id: infer Id }
  ? Id
  : never

export function createEntityAdapter<T extends { id: EntityId }>(options?: {
  sortComparer?: false | Comparer<T>
}): EntityAdapter<T, ExtractEntityId<T>>

export function createEntityAdapter<T, Id extends EntityId>(options: {
  selectId: IdSelector<T, Id>
  sortComparer?: false | Comparer<T>
}): EntityAdapter<T, Id>

/**
 *
 * @param options
 *
 * @public
 */
export function createEntityAdapter<T, Id extends EntityId>(
  options: {
    selectId?: IdSelector<T, Id>
    sortComparer?: false | Comparer<T>
  } = {}
): EntityAdapter<T, Id> {
  const { selectId, sortComparer }: EntityDefinition<T, Id> = {
    sortComparer: false,
    selectId: (instance: any) => instance.id as Id,
    ...options,
  }

  const stateFactory = createInitialStateFactory<T, Id>()
  const selectorsFactory = createSelectorsFactory<T, Id>()
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
