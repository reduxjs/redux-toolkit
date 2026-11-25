import type {
  Draft,
  ImmutabilityAdapter,
  ImmutabilityPatchSupport,
  Patch,
} from '@reduxjs/toolkit'
import {
  immerAdapter,
  immerAdapterWithPatches,
  noopAdapter,
} from '@reduxjs/toolkit'
import type { Patch as QueryPatch } from '@reduxjs/toolkit/query'
import type { Patch as ImmerPatch } from 'immer'
import type { Patch as MutativePatch } from 'mutative'

describe('type tests', () => {
  test('Patch matches the RTK Query and Immer patch types', () => {
    expectTypeOf<Patch>().toEqualTypeOf<QueryPatch>()
    expectTypeOf<Patch>().toEqualTypeOf<ImmerPatch>()
  })

  test('Mutative array-path patches are assignable both ways', () => {
    expectTypeOf<MutativePatch<{ pathAsArray: true }>>().toExtend<Patch>()
    expectTypeOf<Patch>().toExtend<MutativePatch<{ pathAsArray: true }>>()
  })

  test('patch support is optional', () => {
    expectTypeOf<ImmutabilityAdapter['patches']>().toEqualTypeOf<
      ImmutabilityPatchSupport | undefined
    >()
    expectTypeOf(noopAdapter).toExtend<ImmutabilityAdapter>()
    expectTypeOf(immerAdapter).toExtend<ImmutabilityAdapter>()
    expectTypeOf(immerAdapterWithPatches).toExtend<ImmutabilityAdapter>()
  })

  test('produce infers the state type and types the draft', () => {
    const next = immerAdapter.produce({ count: 0 }, (draft) => {
      expectTypeOf(draft).toEqualTypeOf<Draft<{ count: number }>>()
      draft.count++
    })
    expectTypeOf(next).toEqualTypeOf<{ count: number }>()
  })

  test('recipes may return a replacement value', () => {
    immerAdapter.produce({ count: 0 }, () => ({ count: 1 }))
    // @ts-expect-error the replacement must match the state type
    immerAdapter.produce({ count: 0 }, () => ({ total: 1 }))
  })

  test('produceWithPatches returns the next state and both patch lists', () => {
    const result = immerAdapterWithPatches.patches!.produceWithPatches(
      { count: 0 },
      (draft) => {
        draft.count++
      },
    )
    expectTypeOf(result).toEqualTypeOf<
      readonly [
        next: { count: number },
        patches: Patch[],
        inversePatches: Patch[],
      ]
    >()
  })
})
