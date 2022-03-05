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

export interface EntityAdapterOptions<T, Id extends EntityId = EntityId> {
  selectId?: IdSelector<T, Id>
  sortComparer?: false | Comparer<T>
}

type IsEntityId<T> = T extends EntityId ? T : EntityId

type ExtractId<T> = T extends { id: infer Id } ? Id : never

type ExtractEntityId<
  T,
  O extends EntityAdapterOptions<T>
> = O['selectId'] extends IdSelector<T, infer Id>
  ? Id
  : IsEntityId<ExtractId<T>>

/**
 *
 * @param options
 *
 * @public
 */
export function createEntityAdapter<
  T,
  O extends EntityAdapterOptions<T> = EntityAdapterOptions<T>
>(options: O = {} as O): EntityAdapter<T, ExtractEntityId<T, O>> {
  type Id = ExtractEntityId<T, O>
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
