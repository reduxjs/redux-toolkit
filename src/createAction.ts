import { Action } from 'redux'

/**
 * An action with a string type and an associated payload. This is the
 * type of action returned by `createAction()` action creators.
 *
 * @template P The type of the action's payload.
 */
export interface PayloadAction<P = any> extends Action<string> {
  payload: P
}

/**
 * An action creator that produces actions with a `payload` attribute.
 */
export interface PayloadActionCreator<P = any> {
  (): Action<string>
  (payload: P): PayloadAction<P>
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
export function createAction<P = any>(type: string): PayloadActionCreator<P> {
  function actionCreator(): Action<string>
  function actionCreator(payload: P): PayloadAction<P>
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
export function getType<P>(actionCreator: PayloadActionCreator<P>): string {
  return `${actionCreator}`
}
