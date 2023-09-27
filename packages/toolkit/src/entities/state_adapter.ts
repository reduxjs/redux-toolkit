import { produce as createNextState, isDraft } from 'immer'
import type {  Draft } from 'immer'
import type { EntityId, DraftableEntityState, EntityState, PreventAny } from './models'
import type { PayloadAction } from '../createAction'
import { isFSA } from '../createAction'
import { IsAny } from '../tsHelpers'

export const isDraftTyped = isDraft as <T>(value: T | Draft<T>) => value is Draft<T>

export function createSingleArgumentStateOperator<T, Id extends EntityId>(
  mutator: (state: EntityState<T, Id>) => void
) {
  const operator = createStateOperator(
    (_: undefined, state: EntityState<T, Id>) => mutator(state)
  )

  return function operation<S extends EntityState<T, Id>>(
    state: PreventAny<S, T, Id>
  ): S {
    return operator(state as S, undefined)
  }
}

export function createStateOperator<T, Id extends EntityId, R>(
  mutator: (arg: R, state: EntityState<T, Id>) => void
) {
  return function operation<S extends EntityState<T, Id>>(
    state: S,
    arg: R | PayloadAction<R>
  ): S {
    function isPayloadActionArgument(
      arg: R | PayloadAction<R>
    ): arg is PayloadAction<R> {
      return isFSA(arg)
    }

    const runMutator = (draft: EntityState<T, Id>) => {
      if (isPayloadActionArgument(arg)) {
        mutator(arg.payload, draft)
      } else {
        mutator(arg, draft)
      }
    }

    if (isDraftTyped<EntityState<V>>(state)) {
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
