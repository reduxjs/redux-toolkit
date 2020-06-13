import { Action, AnyAction } from 'redux'
import {
  CaseReducer,
  CaseReducers,
  ActionMatcher,
  ActionMatcherDescriptionCollection
} from './createReducer'

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

  /**
   * TODO documentation
   * @param matcher
   * @param reducer
   */
  addMatcher<A extends AnyAction>(
    matcher: ActionMatcher<A>,
    reducer: CaseReducer<State, A>
  ): Omit<ActionReducerMapBuilder<State>, 'addCase'>
}

export function executeReducerBuilderCallback<S>(
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void
): [CaseReducers<S, any>, ActionMatcherDescriptionCollection<S>] {
  const actionsMap: CaseReducers<S, any> = {}
  const actionMatchers: ActionMatcherDescriptionCollection<S> = []
  const builder = {
    addCase(
      typeOrActionCreator: string | TypedActionCreator<any>,
      reducer: CaseReducer<S>
    ) {
      if (process.env.NODE_ENV !== 'production') {
        /*
         to keep the definition by the user in line with actual behavior, 
         we enforce `addCase` to always be called before calling `addMatcher`
         as matching cases take precedence over matchers
         */
        if (actionMatchers.length > 0) {
          throw new Error(
            '`builder.addCase` should only be called before calling `builder.addMatcher`'
          )
        }
      }
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
    },
    addMatcher<A extends AnyAction>(
      matcher: ActionMatcher<A>,
      reducer: CaseReducer<S, A>
    ) {
      actionMatchers.push({ matcher, reducer })
      return builder
    }
  }
  builderCallback(builder)
  return [actionsMap, actionMatchers]
}
