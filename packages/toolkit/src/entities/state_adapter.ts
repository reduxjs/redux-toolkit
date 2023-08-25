import createNextState, { isDraft } from 'immer'
import type { Draft } from 'immer'
import type { DraftableEntityState, EntityState, PreventAny } from './models'
import type { PayloadAction } from '../createAction'
import { isFSA } from '../createAction'
import { IsAny } from '../tsHelpers'

export const isDraftTyped = isDraft as <T>(value: T | Draft<T>) => value is Draft<T>

export function createSingleArgumentStateOperator<V>(
  mutator: (state: DraftableEntityState<V>) => void
) {
  const operator = createStateOperator((_: undefined, state: DraftableEntityState<V>) =>
    mutator(state)
  )

  return function operation<S extends DraftableEntityState<V>>(
    state: PreventAny<S, V>
  ): S {
    return operator(state as S, undefined)
  }
}

export function createStateOperator<V, R>(
  mutator: (arg: R, state: DraftableEntityState<V>) => void
) {
  return function operation<S extends DraftableEntityState<V>>(
    state: S,
    arg: R | PayloadAction<R>
  ): S {
    function isPayloadActionArgument(
      arg: R | PayloadAction<R>
    ): arg is PayloadAction<R> {
      return isFSA(arg)
    }

    const runMutator = (draft: DraftableEntityState<V>) => {
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
