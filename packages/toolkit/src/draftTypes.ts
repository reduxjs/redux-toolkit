type PrimitiveType = number | string | boolean

type AtomicObject = Function | Promise<any> | Date | RegExp

type IfAvailable<T, Fallback = void> = true | false extends (
  T extends never ? true : false
)
  ? Fallback
  : keyof T extends never
    ? Fallback
    : T

type WeakReferences = IfAvailable<WeakMap<any, any>> | IfAvailable<WeakSet<any>>

type IsPlainArray<T extends readonly any[]> = T extends readonly (infer U)[]
  ? U[] extends T
    ? true
    : false
  : false

/**
 * The mutable version of a non-array object type, as seen inside an Immer
 * recipe. Matches Immer's `WritableNonArrayDraft`.
 *
 * @public
 */
export type WritableNonArrayDraft<T> = {
  -readonly [K in keyof T]: { _: T[K] } extends { _: infer V }
    ? V extends object
      ? Draft<V>
      : V
    : never
}

/**
 * The mutable version of an object or array type, as seen inside an Immer
 * recipe. Matches Immer's `WritableDraft`, but is declared by Redux Toolkit
 * so that emitted declarations reference `@reduxjs/toolkit` instead of
 * Immer's internal helper types.
 *
 * @public
 */
export type WritableDraft<T> = T extends readonly any[]
  ? number extends T['length']
    ? IsPlainArray<T> extends true
      ? Draft<T[number]>[]
      : WritableNonArrayDraft<T>
    : WritableNonArrayDraft<T>
  : WritableNonArrayDraft<T>

/**
 * The type of a value while it is being modified inside an Immer recipe,
 * such as the `state` argument of a case reducer. Matches Immer's `Draft`,
 * but is declared by Redux Toolkit so that emitted declarations reference
 * `@reduxjs/toolkit` instead of Immer's internal helper types.
 *
 * @public
 */
export type Draft<T> = T extends PrimitiveType
  ? T
  : T extends AtomicObject
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<Draft<K>, Draft<V>>
      : T extends ReadonlySet<infer V>
        ? Set<Draft<V>>
        : T extends WeakReferences
          ? T
          : T extends object
            ? WritableDraft<T>
            : T
