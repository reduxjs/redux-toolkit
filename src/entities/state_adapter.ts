import createNextState, { Draft, isDraft } from 'immer'
import { EntityState } from './models'
import { PayloadAction, isFSA } from '../createAction'

export function createStateOperator<V, R>(
  mutator: (arg: R, state: EntityState<V>) => void
): EntityState<V>
export function createStateOperator<V, R>(
  mutator: (arg: any, state: any) => void
): any {
  return function operation<S extends EntityState<V>>(
    state: any,
    arg: R | PayloadAction<R>
  ): S {
    const runMutator = (draft: Draft<EntityState<V>>) => {
      if (isFSA(arg)) {
        mutator(arg.payload, draft)
      } else {
        mutator(arg, draft)
      }
    }

    if (isDraft(state)) {
      // we must already be inside a `createNextState` call, likely because
      // this is being wrapped in `createReducer` or `createSlice`.
      // It's safe to just pass the draft to the mutator.
      runMutator(state)

      // since it's a draft, we'll just return it
      return state
    } else {
      // @ts-ignore createNextState() produces an Immutable<Draft<S>> rather
      // than an Immutable<S>, and TypeScript cannot find out how to reconcile
      // these two types.
      return createNextState(state, runMutator)
    }
  }
}
