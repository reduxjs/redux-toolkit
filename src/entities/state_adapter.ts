import createNextState, { Draft } from 'immer'
import { EntityState } from './models'

export function createStateOperator<V, R>(
  mutator: (arg: R, state: EntityState<V>) => void
): EntityState<V>
export function createStateOperator<V, R>(
  mutator: (arg: any, state: any) => void
): any {
  return function operation<S extends EntityState<V>>(arg: R, state: any): S {
    // @ts-ignore createNextState() produces an Immutable<Draft<S>> rather
    // than an Immutable<S>, and TypeScript cannot find out how to reconcile
    // these two types.
    return createNextState(state, (draft: Draft<EntityState<V>>) => {
      mutator(arg, draft)
    })
  }
}
