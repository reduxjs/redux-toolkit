/**
 * A type guard that narrows `undefined` out of a value, intended as a
 * filter callback so the resulting array loses `undefined` from its type.
 *
 * @example
 * <caption>Dropping optional entries from an array</caption>
 *
 * ```ts
 * const defined = [a, undefined, b].filter(removeUndefined);
 * ```
 *
 * @template T - The type of the value once `undefined` is excluded.
 * @param t - The value to test.
 * @returns `true` if the value is not `undefined`, `false` otherwise.
 *
 * @since 1.0.0
 * @public
 */
export function removeUndefined<T>(t: T | undefined): t is T {
  return typeof t !== 'undefined';
}
