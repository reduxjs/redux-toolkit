import { Action, ActionCreator } from 'redux'

// The `redux-starter-kit` typings are a superset of the `redux` typings.
export * from 'redux'

/* createAction() */

/**
 * An action with an associated payload. The type of action returned by
 * action creators that are generated using {@link createAction}.
 *
 * @template P The type of the action's payload.
 * @template T the type of the action's `type` tag.
 */
export interface PayloadAction<P = any, T = any> extends Action<T> {
  payload: P
}

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type
 */
export function createAction<P = any, T = any>(
  type: T
): ActionCreator<PayloadAction<P, T>>

/* Reducers */
