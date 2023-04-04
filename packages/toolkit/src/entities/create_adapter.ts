import type { Draft } from 'immer'
import { isDraft, current, produce as createNextState } from 'immer'
import type {
  EntityDefinition,
  Comparer,
  IdSelector,
  EntityAdapter,
} from './models'
import { createInitialStateFactory } from './entity_state'
import { buildCreateSelectorsFactory } from './state_selectors'
import { buildCreateSortedStateAdapter } from './sorted_state_adapter'
import { buildCreateUnsortedStateAdapter } from './unsorted_state_adapter'
import type { BuildCreateDraftSafeSelectorConfiguration } from '..'
import type { BuildStateOperatorConfiguration } from './state_adapter'

export interface BuildCreateEntityAdapterConfiguration
  extends BuildCreateDraftSafeSelectorConfiguration,
    BuildStateOperatorConfiguration {}

export type CreateEntityAdapter = {
  <T>(options: {
    selectId?: IdSelector<T>
    sortComparer?: false | Comparer<T>
  }): EntityAdapter<T>
}

export function buildCreateEntityAdapter(
  config: BuildCreateEntityAdapterConfiguration
): CreateEntityAdapter {
  const createSelectorsFactory = buildCreateSelectorsFactory(config)
  const createUnsortedStateAdapter = buildCreateUnsortedStateAdapter(config)
  const createSortedStateAdapter = buildCreateSortedStateAdapter(config)
  return function createEntityAdapter<T>(
    options: {
      selectId?: IdSelector<T>
      sortComparer?: false | Comparer<T>
    } = {}
  ): EntityAdapter<T> {
    const { selectId, sortComparer }: EntityDefinition<T> = {
      sortComparer: false,
      selectId: (instance: any) => instance.id,
      ...options,
    }

    const stateFactory = createInitialStateFactory<T>()
    const selectorsFactory = createSelectorsFactory<T>()
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

export const createEntityAdapter = buildCreateEntityAdapter({
  isDraft,
  current,
  createNextState,
})
