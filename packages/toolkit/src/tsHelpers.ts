import type { Middleware, StoreEnhancer } from 'redux'
import type { Tuple } from './utils'

export function safeAssign<T extends object>(
  target: T,
  ...args: Array<Partial<NoInfer<T>>>
) {
  Object.assign(target, ...args)
}

/**
 * return True if T is `any`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsAny<T, True, False = never> =
  // test if we are going the left AND right path in the condition
  true | false extends (T extends never ? true : false) ? True : False

export type CastAny<T, CastTo> = IsAny<T, CastTo, T>

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
  ...infer Tail,
]
  ? ExcludeFromTuple<Tail, E, [...Acc, ...([Head] extends [E] ? [] : [Head])]>
  : Acc

type ExtractDispatchFromMiddlewareTuple<
  MiddlewareTupleType extends readonly any[],
  Acc extends {},
> = MiddlewareTupleType extends [infer Head, ...infer Tail]
  ? ExtractDispatchFromMiddlewareTuple<
      Tail,
      Acc &
        (Head extends Middleware<infer InferredDispatchExtensionType>
          ? IsAny<
              InferredDispatchExtensionType,
              {},
              InferredDispatchExtensionType
            >
          : {})
    >
  : Acc

export type ExtractDispatchExtensions<MiddlewareTupleType> =
  MiddlewareTupleType extends Tuple<infer InferredMiddlewareTupleType>
    ? ExtractDispatchFromMiddlewareTuple<InferredMiddlewareTupleType, {}>
    : MiddlewareTupleType extends ReadonlyArray<Middleware>
      ? ExtractDispatchFromMiddlewareTuple<[...MiddlewareTupleType], {}>
      : never

type ExtractStoreExtensionsFromEnhancerTuple<
  EnhancerTupleType extends readonly any[],
  Acc extends {},
> = EnhancerTupleType extends [infer Head, ...infer Tail]
  ? ExtractStoreExtensionsFromEnhancerTuple<
      Tail,
      Acc &
        (Head extends StoreEnhancer<infer InferredStoreExtensionType>
          ? IsAny<InferredStoreExtensionType, {}, InferredStoreExtensionType>
          : {})
    >
  : Acc

export type ExtractStoreExtensions<EnhancerTupleType> =
  EnhancerTupleType extends Tuple<infer InferredEnhancerTupleType>
    ? ExtractStoreExtensionsFromEnhancerTuple<InferredEnhancerTupleType, {}>
    : EnhancerTupleType extends ReadonlyArray<StoreEnhancer>
      ? UnionToIntersection<
          EnhancerTupleType[number] extends StoreEnhancer<
            infer InferredStoreExtensionType
          >
            ? InferredStoreExtensionType extends {}
              ? IsAny<
                  InferredStoreExtensionType,
                  {},
                  InferredStoreExtensionType
                >
              : {}
            : {}
        >
      : never

type ExtractStateExtensionsFromEnhancerTuple<
  EnhancerTupleType extends readonly any[],
  Acc extends {},
> = EnhancerTupleType extends [infer Head, ...infer Tail]
  ? ExtractStateExtensionsFromEnhancerTuple<
      Tail,
      Acc &
        (Head extends StoreEnhancer<any, infer InferredStateExtensionType>
          ? IsAny<InferredStateExtensionType, {}, InferredStateExtensionType>
          : {})
    >
  : Acc

export type ExtractStateExtensions<EnhancerTupleType> =
  EnhancerTupleType extends Tuple<infer InferredEnhancerTupleType>
    ? ExtractStateExtensionsFromEnhancerTuple<InferredEnhancerTupleType, {}>
    : EnhancerTupleType extends ReadonlyArray<StoreEnhancer>
      ? UnionToIntersection<
          EnhancerTupleType[number] extends StoreEnhancer<
            any,
            infer InferredStateExtensionType
          >
            ? InferredStateExtensionType extends {}
              ? IsAny<
                  InferredStateExtensionType,
                  {},
                  InferredStateExtensionType
                >
              : {}
            : {}
        >
      : never

export type NonUndefined<T> = T extends undefined ? never : T

export type WithRequiredProp<T, RequiredKeys extends keyof T> = Omit<
  T,
  RequiredKeys
> &
  Required<Pick<T, RequiredKeys>>

export type WithOptionalProp<T, OptionalKeys extends keyof T> = Omit<
  T,
  OptionalKeys
> &
  Partial<Pick<T, OptionalKeys>>

export type TypeGuard<T> = (value: any) => value is T

export type HasMatchFunction<T> = {
  match: TypeGuard<T>
}

export const hasMatchFunction = <T>(
  v: Matcher<T>,
): v is HasMatchFunction<T> => {
  return v && typeof (v as HasMatchFunction<T>).match === 'function'
}

/** @public */
export type Matcher<T> = HasMatchFunction<T> | TypeGuard<T>

/** @public */
export type ActionFromMatcher<MatcherType extends Matcher<any>> =
  MatcherType extends Matcher<infer InferredMatchedActionType>
    ? InferredMatchedActionType
    : never

export type Id<T> = { [KeyType in keyof T]: T[KeyType] } & {}

export type Tail<ArrayType extends any[]> = ArrayType extends [
  any,
  ...infer InferredTailType,
]
  ? InferredTailType
  : never

export type UnknownIfNonSpecific<T> = {} extends T ? unknown : T

/**
 * A Promise that will never reject.
 * @see https://github.com/reduxjs/redux-toolkit/issues/4101
 */
export type SafePromise<T> = Promise<T> & {
  __linterBrands: 'SafePromise'
}
