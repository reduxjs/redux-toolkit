import type { PayloadAction } from '../createAction'
import { isFSA } from '../createAction'
import type { Draft } from '../immerImports'
import { createNextState, isDraft } from '../immerImports'
import type { DraftableEntityState, EntityId, PreventAny } from './models'

export const isDraftTyped = isDraft as <T>(
  value: T | Draft<T>,
) => value is Draft<T>

export function createSingleArgumentStateOperator<
  T,
  EntityIdType extends EntityId,
>(mutator: (state: DraftableEntityState<T, EntityIdType>) => void) {
  const operator = createStateOperator(
    (_: undefined, state: DraftableEntityState<T, EntityIdType>) =>
      mutator(state),
  )

  return function operation<S extends DraftableEntityState<T, EntityIdType>>(
    state: PreventAny<S, T, EntityIdType>,
  ): S {
    return operator(state as S, undefined)
  }
}

export function createStateOperator<T, EntityIdType extends EntityId, R>(
  mutator: (arg: R, state: DraftableEntityState<T, EntityIdType>) => void,
) {
  return function operation<S extends DraftableEntityState<T, EntityIdType>>(
    state: S,
    arg: R | PayloadAction<R>,
  ): S {
    function isPayloadActionArgument(
      arg: R | PayloadAction<R>,
    ): arg is PayloadAction<R> {
      return isFSA(arg)
    }

    const runMutator = (draft: DraftableEntityState<T, EntityIdType>) => {
      if (isPayloadActionArgument(arg)) {
        mutator(arg.payload, draft)
      } else {
        mutator(arg, draft)
      }
    }

    if (isDraftTyped<DraftableEntityState<T, EntityIdType>>(state)) {
      // we must already be inside a `createNextState` call, likely because
      // this is being wrapped in `createReducer` or `createSlice`.
      // It's safe to just pass the draft to the mutator.
      runMutator(state)

      // since it's a draft, we'll just return it
      return state
    }

    return createNextState(state, runMutator)
  }
}
