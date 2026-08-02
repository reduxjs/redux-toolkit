/**
 * Local copy of the one helper v3 uses from `../utils`. Copied rather than
 * imported because `../utils` has a top-level `immer` import (for
 * `freezeDraftable`), and keeping the v3 graph Immer-free outside
 * `immerAdapter.ts` is what makes the swappable-immutability bundle story
 * testable.
 */
export function getOrInsertComputed<K extends object, V>(
  map: WeakMap<K, V>,
  key: K,
  compute: (key: K) => V,
): V
export function getOrInsertComputed<K, V>(
  map: Map<K, V>,
  key: K,
  compute: (key: K) => V,
): V
export function getOrInsertComputed<K extends object, V>(
  map: Map<K, V> | WeakMap<K, V>,
  key: K,
  compute: (key: K) => V,
): V {
  if (map.has(key)) return map.get(key) as V

  return map.set(key, compute(key)).get(key) as V
}
