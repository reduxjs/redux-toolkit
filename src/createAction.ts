import { Action } from 'redux'
import { IsUnknownOrNonInferrable } from './tsHelpers'

/**
 * An action with a string type and an associated payload. This is the
 * type of action returned by `createAction()` action creators.
 *
 * @template P The type of the action's payload.
 * @template T the type used for the action type.
 * @template M The type of the action's meta (optional)
 */
export type PayloadAction<
  P = void,
  T extends string = string,
  M = void
> = WithOptionalMeta<M, WithPayload<P, Action<T>>>

export type PrepareAction<P> =
  | ((...args: any[]) => { payload: P })
  | ((...args: any[]) => { payload: P; meta: any })

export type ActionCreatorWithPreparedPayload<
  PA extends PrepareAction<any> | void,
  T extends string = string
> = WithTypeProperty<
  T,
  PA extends PrepareAction<infer P>
    ? (...args: Parameters<PA>) => PayloadAction<P, T, MetaOrVoid<PA>>
    : void
>

export type ActionCreatorWithOptionalPayload<
  P,
  T extends string = string
> = WithTypeProperty<
  T,
  {
    (payload?: undefined): PayloadAction<undefined, T>
    <PT extends Diff<P, undefined>>(payload?: PT): PayloadAction<PT, T>
  }
>

export type ActionCreatorWithoutPayload<
  T extends string = string
> = WithTypeProperty<T, () => PayloadAction<undefined, T>>

export type ActionCreatorWithPayload<
  P,
  T extends string = string
> = WithTypeProperty<
  T,
  IsUnknownOrNonInferrable<
    P,
    // TS < 3.5 infers non-inferrable types to {}, which does not take `null`. This enforces `undefined` instead.
    <PT extends unknown>(payload: PT) => PayloadAction<PT, T>,
    // default behaviour
    <PT extends P>(payload: PT) => PayloadAction<PT, T>
  >
>

/**
 * An action creator that produces actions with a `payload` attribute.
 */
export type PayloadActionCreator<
  P = void,
  T extends string = string,
  PA extends PrepareAction<P> | void = void
> = IfPrepareActionMethodProvided<
  PA,
  ActionCreatorWithPreparedPayload<PA, T>,
  // else
  IfMaybeUndefined<
    P,
    ActionCreatorWithOptionalPayload<P, T>,
    // else
    IfVoid<
      P,
      ActionCreatorWithoutPayload<T>,
      // else
      ActionCreatorWithPayload<P, T>
    >
  >
>

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type The action type to use for created actions.
 * @param prepare (optional) a method that takes any number of arguments and returns { payload } or { payload, meta }.
 *                If this is given, the resulting action creator will pass it's arguments to this method to calculate payload & meta.
 */

export function createAction<P = void, T extends string = string>(
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

// helper types for more readable typings

type Diff<T, U> = T extends U ? never : T

type WithPayload<P, T> = T & { payload: P }

type WithOptionalMeta<M, T> = T & ([M] extends [void] ? {} : { meta: M })

type WithTypeProperty<T, MergeIn> = {
  type: T
} & MergeIn

type IfPrepareActionMethodProvided<
  PA extends PrepareAction<any> | void,
  True,
  False
> = PA extends (...args: any[]) => any ? True : False

type MetaOrVoid<PA extends PrepareAction<any>> = ReturnType<PA> extends {
  meta: infer M
}
  ? M
  : void

type IfMaybeUndefined<P, True, False> = [undefined] extends [P] ? True : False

type IfVoid<P, True, False> = [void] extends [P] ? True : False
