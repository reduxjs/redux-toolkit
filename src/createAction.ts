import { Action } from 'redux'

/**
 * An action with a string type and an associated payload. This is the
 * type of action returned by `createAction()` action creators.
 *
 * @template P The type of the action's payload.
 * @template T the type used for the action type.
 */
export type PayloadAction<
  P = any,
  T extends string = string,
  M = void
> = Action<T> & {
  payload: P
} & ([M] extends [void] ? {} : { meta: M })

export type Diff<T, U> = T extends U ? never : T

export type PrepareAction<P> =
  | ((...args: any[]) => { payload: P })
  | ((...args: any[]) => { payload: P; meta: any })

/**
 * An action creator that produces actions with a `payload` attribute.
 */
export type PayloadActionCreator<
  P = any,
  T extends string = string,
  PA extends PrepareAction<P> | void = void
> = {
  type: T
} & (PA extends (...args: any[]) => any
  ? (ReturnType<PA> extends { meta: infer M }
      ? (...args: Parameters<PA>) => PayloadAction<P, T, M>
      : (...args: Parameters<PA>) => PayloadAction<P, T>)
  : (/*
     * The `P` generic is wrapped with a single-element tuple to prevent the
     * conditional from being checked distributively, thus preserving unions
     * of contra-variant types.
     */
    [undefined] extends [P]
      ? {
          (payload?: undefined): PayloadAction<undefined, T>
          <PT extends Diff<P, undefined>>(payload?: PT): PayloadAction<PT, T>
        }
      : [void] extends [P]
      ? {
          (): PayloadAction<undefined, T>
        }
      : {
          <PT extends P>(payload: PT): PayloadAction<PT, T>
        }))

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
): PayloadActionCreator<P, T>

export function createAction<
  PA extends PrepareAction<any>,
  T extends string = string
>(
  type: T,
  prepareAction: PA
): PayloadActionCreator<ReturnType<PA>['payload'], T, PA>

export function createAction(type: string, prepareAction?: Function) {
  function actionCreator(...args: any[]) {
    if (prepareAction) {
      let prepared = prepareAction(...args)
      if (!prepared) {
        throw new Error('prepareAction did not return an object')
      }
      return 'meta' in prepared
        ? { type, payload: prepared.payload, meta: prepared.meta }
        : { type, payload: prepared.payload }
    }
    return { type, payload: args[0] }
  }

  actionCreator.toString = () => `${type}`

  actionCreator.type = type

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
export function getType<T extends string>(
  actionCreator: PayloadActionCreator<any, T>
): T {
  return `${actionCreator}` as T
}
