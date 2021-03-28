import {
  EntityDefinition,
  Comparer,
  EntityAdapter,
  IndexComparers
} from './models'
import { createInitialStateFactory } from './entity_state'
import { createSelectorsFactory } from './state_selectors'
import { createSortedStateAdapter } from './sorted_state_adapter'
import { createUnsortedStateAdapter } from './unsorted_state_adapter'

/**
 *
 * @param options
 *
 * @public
 */

export function createEntityAdapter<T>(
  options?: EntityDefinition<T>
): EntityAdapter<T> {
  const { selectId, sortComparer, indices = {} as IndexComparers<T> } = {
    sortComparer: false as const,
    selectId: (instance: any) => instance.id,
    ...options
  }

  const stateFactory = createInitialStateFactory<T, IndexComparers<T>>(indices)
  const selectorsFactory = createSelectorsFactory<T>()
  const stateAdapter = sortComparer
    ? createSortedStateAdapter(selectId, sortComparer as Comparer<T>, indices)
    : createUnsortedStateAdapter(selectId)

  return {
    selectId,
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter
  }
}
