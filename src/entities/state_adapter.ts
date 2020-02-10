import createNextState, { Draft } from 'immer'
import { EntityState } from './models'

export enum DidMutate {
  EntitiesOnly,
  Both,
  None
}

export function createStateOperator<V, R>(
  mutator: (arg: R, state: EntityState<V>) => DidMutate
): EntityState<V>
export function createStateOperator<V, R>(
  mutator: (arg: any, state: any) => DidMutate
): any {
  return function operation<S extends EntityState<V>>(arg: R, state: any): S {
    // @ts-ignore createNextState() produces an Immutable<Draft<S>> rather
    // than an Immutable<S>, and TypeScript cannot find out how to reconcile
    // these two types.
    return createNextState(state, (draft: Draft<EntityState<V>>) => {
      const { ids: originalIds } = draft
      const didMutate = mutator(arg, draft)

      if (didMutate === DidMutate.EntitiesOnly) {
        draft.ids = originalIds
      }
    })
  }
}
