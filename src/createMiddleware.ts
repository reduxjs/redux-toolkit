import { Action, AnyAction, Dispatch, Middleware } from 'redux'
import {
  ActionMiddlewareMapBuilder,
  executeMiddlewareBuilderCallback
} from './mapBuilders'

/**
 * A *case middleware* is a middleware function for a specific action type.
 *
 * @public
 */
export type CaseMiddleware<A extends Action = AnyAction> = (
  action: A,
  dispatch: Dispatch
) => Promise<void> | void

/**
 * A utility function that allows defining middleware as a mapping from action
 * type to *case reducer* functions that handle these action types.
 *
 * @param builderCallback A callback that receives a *builder* object to define
 * case middleware via calls to:
 * `builder.addCase(actionCreatorOrType, (action, dispatch) => void)`.
 *
 * @public
 */
export function createMiddleware(
  builderCallback: (builder: ActionMiddlewareMapBuilder) => void
): Middleware {
  const actionsMap = executeMiddlewareBuilderCallback(builderCallback)

  return store => next => action => {
    const midCase = actionsMap[action.type]

    if (midCase) {
      midCase(action, store.dispatch)
    }

    return next(action)
  }
}
