import type { Patch } from '@reduxjs/toolkit/query'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'
import type { Patch as ImmerPatch } from 'immer'
import { applyPatches } from 'immer'

describe('type tests', () => {
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      getCount: build.query<number, void>({
        queryFn: () => ({ data: 0 }),
      }),
    }),
  })

  test('Patch matches Immer Patch', () => {
    expectTypeOf<Patch>().toEqualTypeOf<ImmerPatch>()
  })

  test('PatchCollection uses RTK Patch', () => {
    const thunk = api.util.updateQueryData('getCount', undefined, () => 1)

    type Result = ReturnType<typeof thunk>

    expectTypeOf<Result['patches']>().toEqualTypeOf<Patch[]>()

    expectTypeOf<Result['inversePatches']>().toEqualTypeOf<Patch[]>()
  })

  test('RTK patches work with Immer and RTKQ patch helpers', () => {
    const patches: Patch[] = []

    expectTypeOf(applyPatches({ count: 0 }, patches)).toEqualTypeOf<{
      count: number
    }>()

    api.util.patchQueryData('getCount', undefined, patches)

    const immerPatches: ImmerPatch[] = []

    api.util.patchQueryData('getCount', undefined, immerPatches)
  })
})
