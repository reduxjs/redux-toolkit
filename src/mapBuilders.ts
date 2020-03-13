import { Action, ActionCreator } from 'redux'
import { CaseReducer, CaseReducers } from './createReducer'
import { CaseMiddleware } from './createMiddleware'

export interface TypedActionCreator<Type = string>
  extends ActionCreator<Action<Type>> {
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

/**
 * A builder for an action <-> middleware map.
 *
 * @public
 */
export interface ActionMiddlewareMapBuilder {
  /**
   * Add a case mid for actions created by this action creator.
   * @param actionCreator
   * @param middleware
   */
  addCase<TAC extends TypedActionCreator>(
    actionCreator: TAC,
    middleware: CaseMiddleware<ReturnType<TAC>>
  ): ActionMiddlewareMapBuilder
  /**
   * Add a case reducer for actions with the specified type.
   * @param type
   * @param mid
   */
  addCase(type: string, mid: CaseMiddleware): ActionMiddlewareMapBuilder
}

export function executeMiddlewareBuilderCallback(
  builderCallback: (builder: ActionMiddlewareMapBuilder) => void
): { [key: string]: CaseMiddleware } {
  const actionsMap: { [key: string]: CaseMiddleware } = {}
  const builder = {
    addCase(
      typeOrActionCreator: string | TypedActionCreator,
      middleware: CaseMiddleware
    ) {
      const type =
        typeof typeOrActionCreator === 'string'
          ? typeOrActionCreator
          : typeOrActionCreator.type
      if (type in actionsMap) {
        throw new Error(
          'addCase cannot be called with two middleware cases for the same action type'
        )
      }

      actionsMap[type] = middleware
      return builder
    }
  }
  builderCallback(builder)
  return actionsMap
}
