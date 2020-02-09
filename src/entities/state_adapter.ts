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
    const clonedEntityState: EntityState<V> = {
      ids: [...state.ids],
      entities: { ...state.entities }
    }

    const didMutate = mutator(arg, clonedEntityState)

    if (didMutate === DidMutate.Both) {
      return Object.assign({}, state, clonedEntityState)
    }

    if (didMutate === DidMutate.EntitiesOnly) {
      return {
        ...state,
        entities: clonedEntityState.entities
      }
    }

    return state
  }
}
