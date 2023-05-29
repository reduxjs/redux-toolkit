import type { Middleware, StoreEnhancer } from 'redux'
import type { Draft, Patch, applyPatches } from 'immer'
import type { Tuple } from './utils'

export function safeAssign<T extends object>(
  target: T,
  ...args: Array<Partial<NoInfer<T>>>
) {
  Object.assign(target, ...args)
}

export interface ImmutableHelpers {
  /**
   * Function that receives a base object, and a recipe which is called with a draft that the recipe is allowed to mutate.
   * The recipe can return a new state which will replace the existing state, or it can not return (in which case the existing draft is used)
   * Returns an immutably modified version of the input object.
   */
  createNextState: <Base>(
    base: Base,
    recipe: (draft: Draft<Base>) => void | Base | Draft<Base>
  ) => Base
  /**
   * Function that receives a base object, and a recipe which is called with a draft that the recipe is allowed to mutate.
   * The recipe can return a new state which will replace the existing state, or it can not return (in which case the existing draft is used)
   * Returns a tuple of an immutably modified version of the input object, an array of patches describing the changes made, and an array of inverse patches.
   */
  createWithPatches: <Base>(
    base: Base,
    recipe: (draft: Draft<Base>) => void | Base | Draft<Base>
  ) => readonly [Base, Patch[], Patch[]]
  /**
   * Receives a base object and an array of patches describing changes to apply.
   * Returns an immutably modified version of the base object with changes applied.
   */
  applyPatches: typeof applyPatches
  /**
   * Indicates whether the value passed is a draft, meaning it's safe to mutate.
   */
  isDraft(value: any): boolean
  /**
   * Indicates whether the value passed is possible to turn into a mutable draft.
   */
  isDraftable(value: any): boolean
  /**
   * Receives a draft and returns its base object.
   */
  original<T>(value: T): T | undefined
  /**
   * Receives a draft and returns an object with any changes to date immutably applied.
   */
  current<T>(value: T): T
  /**
   * Receives an object and freezes it, causing runtime errors if mutation is attempted after.
   */
  freeze<T>(obj: T, deep?: boolean): T
}

/**
 * Define a config object indicating utilities for RTK packages to use for immutable operations.
 */
export const defineImmutableHelpers = (helpers: ImmutableHelpers) => helpers

/**
 * return True if T is `any`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsAny<T, True, False = never> =
  // test if we are going the left AND right path in the condition
  true | false extends (T extends never ? true : false) ? True : False

/**
 * return True if T is `unknown`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsUnknown<T, True, False = never> = unknown extends T
  ? IsAny<T, False, True>
  : False

export type FallbackIfUnknown<T, Fallback> = IsUnknown<T, Fallback, T>

/**
 * @internal
 */
export type IfMaybeUndefined<P, True, False> = [undefined] extends [P]
  ? True
  : False

/**
 * @internal
 */
export type IfVoid<P, True, False> = [void] extends [P] ? True : False

/**
 * @internal
 */
export type IsEmptyObj<T, True, False = never> = T extends any
  ? keyof T extends never
    ? IsUnknown<T, False, IfMaybeUndefined<T, False, IfVoid<T, False, True>>>
    : False
  : never

/**
 * returns True if TS version is above 3.5, False if below.
 * uses feature detection to detect TS version >= 3.5
 * * versions below 3.5 will return `{}` for unresolvable interference
 * * versions above will return `unknown`
 *
 * @internal
 */
export type AtLeastTS35<True, False> = [True, False][IsUnknown<
  ReturnType<<T>() => T>,
  0,
  1
>]

/**
 * @internal
 */
export type IsUnknownOrNonInferrable<T, True, False> = AtLeastTS35<
  IsUnknown<T, True, False>,
  IsEmptyObj<T, True, IsUnknown<T, True, False>>
>

/**
 * Convert a Union type `(A|B)` to an intersection type `(A&B)`
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

// Appears to have a convenient side effect of ignoring `never` even if that's not what you specified
export type ExcludeFromTuple<T, E, Acc extends unknown[] = []> = T extends [
  infer Head,
  ...infer Tail
]
  ? ExcludeFromTuple<Tail, E, [...Acc, ...([Head] extends [E] ? [] : [Head])]>
  : Acc

type ExtractDispatchFromMiddlewareTuple<
  MiddlewareTuple extends readonly any[],
  Acc extends {}
> = MiddlewareTuple extends [infer Head, ...infer Tail]
  ? ExtractDispatchFromMiddlewareTuple<
      Tail,
      Acc & (Head extends Middleware<infer D> ? IsAny<D, {}, D> : {})
    >
  : Acc

export type ExtractDispatchExtensions<M> = M extends Tuple<
  infer MiddlewareTuple
>
  ? ExtractDispatchFromMiddlewareTuple<MiddlewareTuple, {}>
  : M extends ReadonlyArray<Middleware>
  ? ExtractDispatchFromMiddlewareTuple<[...M], {}>
  : never

type ExtractStoreExtensionsFromEnhancerTuple<
  EnhancerTuple extends readonly any[],
  Acc extends {}
> = EnhancerTuple extends [infer Head, ...infer Tail]
  ? ExtractStoreExtensionsFromEnhancerTuple<
      Tail,
      Acc & (Head extends StoreEnhancer<infer Ext> ? IsAny<Ext, {}, Ext> : {})
    >
  : Acc

export type ExtractStoreExtensions<E> = E extends Tuple<infer EnhancerTuple>
  ? ExtractStoreExtensionsFromEnhancerTuple<EnhancerTuple, {}>
  : E extends ReadonlyArray<StoreEnhancer>
  ? UnionToIntersection<
      E[number] extends StoreEnhancer<infer Ext>
        ? Ext extends {}
          ? IsAny<Ext, {}, Ext>
          : {}
        : {}
    >
  : never

type ExtractStateExtensionsFromEnhancerTuple<
  EnhancerTuple extends readonly any[],
  Acc extends {}
> = EnhancerTuple extends [infer Head, ...infer Tail]
  ? ExtractStateExtensionsFromEnhancerTuple<
      Tail,
      Acc &
        (Head extends StoreEnhancer<any, infer StateExt>
          ? IsAny<StateExt, {}, StateExt>
          : {})
    >
  : Acc

export type ExtractStateExtensions<E> = E extends Tuple<infer EnhancerTuple>
  ? ExtractStateExtensionsFromEnhancerTuple<EnhancerTuple, {}>
  : E extends ReadonlyArray<StoreEnhancer>
  ? UnionToIntersection<
      E[number] extends StoreEnhancer<any, infer StateExt>
        ? StateExt extends {}
          ? IsAny<StateExt, {}, StateExt>
          : {}
        : {}
    >
  : never

/**
 * Helper type. Passes T out again, but boxes it in a way that it cannot
 * "widen" the type by accident if it is a generic that should be inferred
 * from elsewhere.
 *
 * @internal
 */
export type NoInfer<T> = [T][T extends any ? 0 : never]

export type NonUndefined<T> = T extends undefined ? never : T

export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>

export type WithOptionalProp<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>

export interface TypeGuard<T> {
  (value: any): value is T
}

export interface HasMatchFunction<T> {
  match: TypeGuard<T>
}

export const hasMatchFunction = <T>(
  v: Matcher<T>
): v is HasMatchFunction<T> => {
  return v && typeof (v as HasMatchFunction<T>).match === 'function'
}

/** @public */
export type Matcher<T> = HasMatchFunction<T> | TypeGuard<T>

/** @public */
export type ActionFromMatcher<M extends Matcher<any>> = M extends Matcher<
  infer T
>
  ? T
  : never

export type Id<T> = { [K in keyof T]: T[K] } & {}

export type Tail<T extends any[]> = T extends [any, ...infer Tail]
  ? Tail
  : never
