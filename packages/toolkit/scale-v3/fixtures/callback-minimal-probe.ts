// Minimal isolation: does reverse-mapped inference work through a callback RETURN position?
// prettier-ignore
/* eslint-disable */

// Case 1: plain reverse map, direct argument (known to work)
declare function direct<T>(arg: { [K in keyof T]: { v: T[K] } }): T
const d1 = direct({ a: { v: 1 }, b: { v: 'x' } })
const d1check: typeof d1 extends { a: number; b: string } ? true : false = true

// Case 2: same reverse map, behind a zero-arg callback return
declare function viaReturn<T>(cb: () => { [K in keyof T]: { v: T[K] } }): T
const r1 = viaReturn(() => ({ a: { v: 1 }, b: { v: 'x' } }))
const r1check: typeof r1 extends { a: number; b: string } ? true : false = true

// Case 3: callback WITH a parameter (context-sensitive callback)
declare function viaParamReturn<B, T>(options: {
  base: B
  cb: (b: B) => { [K in keyof T]: { v: T[K] } }
}): T
const r2 = viaParamReturn({ base: 'hello', cb: (b) => ({ a: { v: 1 }, b: { v: b } }) })
const r2check: typeof r2 extends { a: number; b: string } ? true : false = true

// Case 4: union constituents like EndpointCells ({$meta}|{kind:{$meta}}), via return
declare function viaUnionReturn<T>(cb: () => {
  [K in keyof T]: { $meta: T[K] } | { kind: { $meta: T[K] } }
}): T
const r3 = viaUnionReturn(() => ({
  a: { $meta: 1 },
  b: { kind: { $meta: 'x' } },
}))
const r3check: typeof r3 extends { a: number; b: string } ? true : false = true

// Case 5: intersection of two maps (like EndpointCells' upsert map), via return — FAILS
declare function viaIntersectReturn<T>(cb: () => {
  [K in keyof T]: { $meta: T[K] }
} & {
  [K in keyof T]?: { extra?: (x: T[K]) => void }
}): T
const r4 = viaIntersectReturn(() => ({
  a: { $meta: 1 },
  b: { $meta: 'x' },
}))
const r4check: typeof r4 extends { a: number; b: string } ? true : false = true

// Case 5b: SAME intersection, direct argument — does direct position tolerate it?
declare function directIntersect<T>(arg: {
  [K in keyof T]: { $meta: T[K] }
} & {
  [K in keyof T]?: { extra?: (x: T[K]) => void }
}): T
const d2 = directIntersect({ a: { $meta: 1 }, b: { $meta: 'x' } })
const d2check: typeof d2 extends { a: number; b: string } ? true : false = true

// Case 6: upsert folded INTO the union member (single map, no intersection), via return
declare function viaFoldedReturn<T>(cb: () => {
  [K in keyof T]:
    | { $meta: T[K] }
    | { kind: { $meta: T[K] }; extra?: (own: T[K], all: T) => void }
}): T
const r5 = viaFoldedReturn(() => ({
  a: { $meta: 1 },
  b: {
    kind: { $meta: 'x' },
    extra: (own, all) => {
      const ownCheck: typeof own extends string ? true : false = true
      const allCheck: typeof all extends { a: number; b: string } ? true : false = true
      void ownCheck
      void allCheck
    },
  },
}))
const r5check: typeof r5 extends { a: number; b: string } ? true : false = true

void d1check
void r1check
void r2check
void r3check
void r4check
void d2check
void r5check

// ---- Real-shape mimicry: union first map + FILTERED-remap second map ----
interface MetaQ { tag: 'q'; val: unknown }
interface MetaM { tag: 'm'; val: unknown }
type AnyMeta = MetaQ | MetaM
type QKeys<T extends Record<string, AnyMeta>> = {
  [K in keyof T]: T[K] extends { tag: 'q' } ? K : never
}[keyof T] & string

type RealShape<T extends Record<string, AnyMeta>> = {
  [K in keyof T]: { $meta: T[K] } | { kind: { $meta: T[K] } }
} & {
  [K in QKeys<T>]: { extra?: (own: T[K]['val'], all: T) => void }
}

// Case 7: direct argument (mirrors what real v3 does today — should work)
declare function realDirect<T extends Record<string, AnyMeta>>(arg: RealShape<T>): T
const d3 = realDirect({
  a: { $meta: { tag: 'q', val: 1 } as { tag: 'q'; val: number } },
  b: {
    kind: { $meta: { tag: 'q', val: 'x' } as { tag: 'q'; val: string } },
    extra: (own, all) => {
      const ownCheck7: typeof own extends string ? true : false = true
      void ownCheck7
    },
  },
})
const d3check: typeof d3 extends { a: { tag: 'q'; val: number } } ? true : false = true

// Case 8: same shape via callback return
declare function realViaReturn<T extends Record<string, AnyMeta>>(cb: () => RealShape<T>): T
const r6 = realViaReturn(() => ({
  a: { $meta: { tag: 'q', val: 1 } as { tag: 'q'; val: number } },
  b: {
    kind: { $meta: { tag: 'q', val: 'x' } as { tag: 'q'; val: string } },
    extra: (own, all) => {
      const ownCheck8: typeof own extends string ? true : false = true
      void ownCheck8
    },
  },
}))
const r6check: typeof r6 extends { a: { tag: 'q'; val: number } } ? true : false = true

// Case 9: same shape via callback return, NO context-sensitive members at all
const r7 = realViaReturn(() => ({
  a: { $meta: { tag: 'q', val: 1 } as { tag: 'q'; val: number } },
  b: { kind: { $meta: { tag: 'q', val: 'x' } as { tag: 'q'; val: string } } },
}))
const r7check: typeof r7 extends { a: { tag: 'q'; val: number } } ? true : false = true

void d3check
void r6check
void r7check

// Case 10: via return, extra callback has ANNOTATED param (non-context-sensitive),
// returning a whole-T-dependent discriminated union — does T survive and does
// the return get checked?
type Desc<T extends Record<string, AnyMeta>> = {
  [K in QKeys<T>]: { endpoint: K; value: T[K]['val'] }
}[QKeys<T>]

type RealShape2<T extends Record<string, AnyMeta>> = {
  [K in keyof T]: { $meta: T[K] } | { kind: { $meta: T[K] } }
} & {
  [K in QKeys<T>]: { extra?: (own: T[K]['val']) => ReadonlyArray<Desc<T>> }
}
declare function realViaReturn2<T extends Record<string, AnyMeta>>(cb: () => RealShape2<T>): T

const r8 = realViaReturn2(() => ({
  a: { $meta: { tag: 'q', val: 1 } as { tag: 'q'; val: number } },
  b: {
    kind: { $meta: { tag: 'q', val: 'x' } as { tag: 'q'; val: string } },
    extra: (own: string) => [{ endpoint: 'a' as const, value: 42 }],
  },
}))
const r8check: typeof r8 extends { a: { tag: 'q'; val: number } } ? true : false = true

// Case 10-neg: wrong value for endpoint 'a' must be rejected
const r9 = realViaReturn2(() => ({
  a: { $meta: { tag: 'q', val: 1 } as { tag: 'q'; val: number } },
  b: {
    kind: { $meta: { tag: 'q', val: 'x' } as { tag: 'q'; val: string } },
    // @ts-expect-error value must be number for endpoint 'a'
    extra: (own: string) => [{ endpoint: 'a' as const, value: 'not-a-number' }],
  },
}))
void r9

void r8check
