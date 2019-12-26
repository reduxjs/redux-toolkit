import { Action } from 'redux'
import { CaseReducer, CaseReducers } from './createReducer'

export interface TypedActionCreator<Type extends string> {
  (...args: any[]): Action<Type>
  type: Type
}

/**
 * A builder for an action <-> reducer map.
 *
 * @public
 */
export interface ActionReducerMapBuilder<State> {
  /**
   * Add a case reducer for actions created by this action creator.
   * @param actionCreator
   * @param reducer
   */
  addCase<ActionCreator extends TypedActionCreator<string>>(
    actionCreator: ActionCreator,
    reducer: CaseReducer<State, ReturnType<ActionCreator>>
  ): ActionReducerMapBuilder<State>
  /**
   * Add a case reducer for actions with the specified type.
   * @param type
   * @param reducer
   */
  addCase<Type extends string, A extends Action<Type>>(
    type: Type,
    reducer: CaseReducer<State, A>
  ): ActionReducerMapBuilder<State>
}

export function executeReducerBuilderCallback<S>(
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void
): CaseReducers<S, any> {
  const actionsMap: CaseReducers<S, any> = {}
  const builder = {
    addCase(
      typeOrActionCreator: string | TypedActionCreator<any>,
      reducer: CaseReducer<S>
    ) {
      const type =
        typeof typeOrActionCreator === 'string'
          ? typeOrActionCreator
          : typeOrActionCreator.type
      if (type in actionsMap) {
        throw new Error(
          'addCase cannot be called with two reducers for the same action type'
        )
      }
      actionsMap[type] = reducer
      return builder
    }
  }
  builderCallback(builder)
  return actionsMap
}
