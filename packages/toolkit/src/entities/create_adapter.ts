import type {
  EntityDefinition,
  Comparer,
  IdSelector,
  EntityAdapter,
  EntityId,
} from './models'
import { createInitialStateFactory } from './entity_state'
import { buildCreateSelectorsFactory } from './state_selectors'
import { buildCreateSortedStateAdapter } from './sorted_state_adapter'
import { buildCreateUnsortedStateAdapter } from './unsorted_state_adapter'
import type { BuildCreateDraftSafeSelectorConfiguration } from '..'
import type { BuildStateOperatorConfiguration } from './state_adapter'
import { immutableHelpers } from '../immer'

export interface BuildCreateEntityAdapterConfiguration
  extends BuildCreateDraftSafeSelectorConfiguration,
    BuildStateOperatorConfiguration {}

export type CreateEntityAdapter = {
  <T, Id extends EntityId>(options?: {
    selectId?: IdSelector<T, Id>
    sortComparer?: false | Comparer<T>
  }): EntityAdapter<T, Id>
}

export function buildCreateEntityAdapter(
  config: BuildCreateEntityAdapterConfiguration
): CreateEntityAdapter {
  const createSelectorsFactory = buildCreateSelectorsFactory(config)
  const createUnsortedStateAdapter = buildCreateUnsortedStateAdapter(config)
  const createSortedStateAdapter = buildCreateSortedStateAdapter(config)
  return function createEntityAdapter<T, Id extends EntityId>(
    options: {
      selectId?: IdSelector<T, Id>
      sortComparer?: false | Comparer<T>
    } = {}
  ): EntityAdapter<T, Id> {
    const { selectId, sortComparer }: EntityDefinition<T, Id> = {
      sortComparer: false,
      selectId: (instance: any) => instance.id,
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
}

export const createEntityAdapter = buildCreateEntityAdapter(immutableHelpers)
