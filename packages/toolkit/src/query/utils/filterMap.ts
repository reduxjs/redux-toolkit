// Preserve type guard predicate behavior when passing to mapper
export function filterMap<T, U, S extends T = T>(
  array: readonly T[],
  predicate: (item: T, index: number) => item is S,
  mapper: (item: S, index: number) => U | U[],
): U[]

export function filterMap<T, U>(
  array: readonly T[],
  predicate: (item: T, index: number) => boolean,
  mapper: (item: T, index: number) => U | U[],
): U[]

export function filterMap<T, U>(
  array: readonly T[],
  predicate: (item: T, index: number) => boolean,
  mapper: (item: T, index: number) => U | U[],
): U[] {
  const result: U[] = []
  for (let i = 0; i < array.length; i++) {
    const item = array[i]
    if (predicate(item, i)) {
      const mapped = mapper(item, i)
      if (Array.isArray(mapped)) {
        result.push(...mapped)
      } else {
        result.push(mapped)
      }
    }
  }
  return result
}
