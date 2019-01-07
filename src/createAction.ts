import { Action } from 'redux'

/**
 * An action with an associated payload. The type of action returned by
 * action creators that are generated using `createAction()`.
 *
 * @template P The type of the action's payload.
 * @template T the type of the action's `type` tag.
 */
export interface PayloadAction<P = any, T = any> extends Action<T> {
  payload: P
}

/**
 * An action creator that produces actions with a `payload` attribute.
 */
export interface PayloadActionCreator<P = any, T = any> {
  (): Action<T>
  (payload: P): PayloadAction<P, T>
}

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type The action type to use for created actions.
 */
export function createAction<P = any>(
  type: string
): PayloadActionCreator<P, string> {
  function actionCreator(): Action<string>
  function actionCreator(payload: P): PayloadAction<P, string>
  function actionCreator(payload?: P) {
    return { type, payload }
  }

  actionCreator.toString = () => `${type}`

  return actionCreator
}

/**
 * Returns the action type of the actions created by the passed
 * `createAction()`-generated action creator (arbitrary action creators
 * are not supported).
 *
 * @param action The action creator whose action type to get.
 * @returns The action type used by the action creator.
 */
export function getType<P>(
  actionCreator: PayloadActionCreator<P, string>
): string {
  return `${actionCreator}`
}
