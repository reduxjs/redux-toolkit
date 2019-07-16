import { Action } from 'redux'

/**
 * An action with a string type and an associated payload. This is the
 * type of action returned by `createAction()` action creators.
 *
 * @template P The type of the action's payload.
 * @template T the type used for the action type.
 */
export interface PayloadAction<P = any, T extends string = string>
  extends Action<T> {
  payload: P
}

export type Diff<T, U> = T extends U ? never : T;

/**
 * An action creator that produces actions with a `payload` attribute.
 */
export type PayloadActionCreator<P = any, T extends string = string> = { type: T } & (
  /*
  * The `P` generic is wrapped with a single-element tuple to prevent the
  * conditional from being checked distributively, thus preserving unions
  * of contra-variant types.
  */
  [undefined] extends [P] ? {
    (payload?: undefined): PayloadAction<undefined, T>
    <PT extends Diff<P, undefined>>(payload?: PT): PayloadAction<PT, T>
  }
  : [void] extends [P] ? {
    (): PayloadAction<undefined, T>
  }
  : {
    <PT extends P>(payload: PT): PayloadAction<PT, T>
  }
);

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type The action type to use for created actions.
 */
export function createAction<P = any, T extends string = string>(
  type: T
): PayloadActionCreator<P, T> {
  function actionCreator(payload?: P): PayloadAction<undefined | P, T> {
    return { type, payload }
  }

  actionCreator.toString = (): T => `${type}` as T

  actionCreator.type = type

  return actionCreator as any
}

/**
 * Returns the action type of the actions created by the passed
 * `createAction()`-generated action creator (arbitrary action creators
 * are not supported).
 *
 * @param action The action creator whose action type to get.
 * @returns The action type used by the action creator.
 */
export function getType<T extends string>(
  actionCreator: PayloadActionCreator<any, T>
): T {
  return `${actionCreator}` as T
}
