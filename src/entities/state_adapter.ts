import createNextState, { Draft } from 'immer'
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
    // @ts-ignore createNextState() produces an Immutable<Draft<S>> rather
    // than an Immutable<S>, and TypeScript cannot find out how to reconcile
    // these two types.
    return createNextState(state, (draft: Draft<EntityState<V>>) => {
      if (isFSA(arg)) {
        mutator(arg.payload, draft)
      } else {
        mutator(arg, draft)
      }
    })
  }
}
