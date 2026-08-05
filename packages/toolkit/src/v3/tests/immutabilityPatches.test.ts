import { configureStore } from '../../configureStore'
import type { PayloadAction } from '../../createAction'
import { buildCreateSlice } from '../index'
import { noopAdapterWithPatches } from '../immutability'
import { immerAdapterWithPatches } from '../immerAdapter'
import { mutativeAdapterWithPatches } from '../mutativeAdapter'
import type {
  Draft,
  ImmutabilityAdapter,
  Patches,
} from '../immutability'

/**
 * Prototype validation for the opaque-patches adapter extension: can RTK
 * Query's optimistic-update machinery (produce patches outside the store,
 * dispatch them into a case reducer that applies them to a draft, undo via
 * inverse patches) be expressed against the adapter contract, with the
 * patch format fully opaque?
 *
 * Each adapter family is exercised in its own update style: Immer and
 * Mutative recipes mutate drafts; the no-op adapter has no drafts, so its
 * recipes and case reducers return next state.
 */

type Data = { items: string[]; count: number }

const cases = [
  ['immerAdapterWithPatches', immerAdapterWithPatches, 'mutate'],
  ['mutativeAdapterWithPatches', mutativeAdapterWithPatches, 'mutate'],
  ['noopAdapterWithPatches', noopAdapterWithPatches, 'return'],
] as const

describe.each(cases)('%s', (_name, adapter, style) => {
  const patchSupport = adapter.patches!

  const updateRecipe =
    style === 'mutate'
      ? (draft: Draft<Data>) => {
          draft.items.push('b')
          draft.count = 2
        }
      : (draft: Draft<Data>): Data => ({
          items: [...draft.items, 'b'],
          count: 2,
        })

  const getBase = (): Data => ({ items: ['a'], count: 1 })

  test('produceWithPatches and applyPatches are reciprocal', () => {
    const base = getBase()
    const [next, patches, inversePatches] = patchSupport.produceWithPatches(
      base,
      updateRecipe,
    )

    expect(next).toEqual({ items: ['a', 'b'], count: 2 })
    expect(base).toEqual(getBase())

    expect(patchSupport.applyPatches(getBase(), patches)).toEqual(next)
    expect(patchSupport.applyPatches(next, inversePatches)).toEqual(getBase())
  })

  test('handles non-draftable bases', () => {
    const [next, patches, inversePatches] = patchSupport.produceWithPatches(
      'abc' as string,
      () => 'xyz',
    )

    expect(next).toBe('xyz')
    expect(patchSupport.applyPatches('abc', patches)).toBe('xyz')
    expect(patchSupport.applyPatches('xyz', inversePatches)).toBe('abc')
  })

  test('handles returning recipes (subscription-diff pattern)', () => {
    // batchActions.ts:179 diffs two plain snapshots by producing with a
    // recipe that just returns the new value. Mutative logs its rawReturn
    // suggestion for object returns; silence it for the assertion.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const prev = { subs: { q1: 1 } }
      const nextValue = { subs: { q1: 1, q2: 1 } }
      const [next, patches, inversePatches] =
        patchSupport.produceWithPatches(prev, () => nextValue)

      expect(next).toEqual(nextValue)
      expect(patchSupport.applyPatches(prev, patches)).toEqual(nextValue)
      expect(patchSupport.applyPatches(next, inversePatches)).toEqual(prev)
    } finally {
      warnSpy.mockRestore()
    }
  })

  test('optimistic update through a store: patch, then undo', () => {
    const createAppSlice = buildCreateSlice({ immutability: adapter })

    interface CacheState {
      entries: Record<string, { data: Data }>
    }

    const getInitialCache = (): CacheState => ({
      entries: {
        q1: { data: { items: ['a'], count: 1 } },
        q2: { data: { items: ['z'], count: 1 } },
      },
    })

    type PatchPayload = { key: string; patches: Patches }

    const cacheSlice = createAppSlice({
      name: 'cache',
      initialState: getInitialCache(),
      reducers: {
        // the queryResultPatched pattern (2.x buildSlice.ts:369): apply
        // dispatched patches to the draft's cache entry
        patchApplied:
          style === 'mutate'
            ? (state: Draft<CacheState>, action: PayloadAction<PatchPayload>) => {
                const entry = state.entries[action.payload.key]
                entry.data = patchSupport.applyPatches(
                  entry.data,
                  action.payload.patches,
                )
              }
            : (
                state: Draft<CacheState>,
                action: PayloadAction<PatchPayload>,
              ): CacheState => ({
                entries: {
                  ...state.entries,
                  [action.payload.key]: {
                    data: patchSupport.applyPatches(
                      state.entries[action.payload.key].data,
                      action.payload.patches,
                    ),
                  },
                },
              }),
      },
    })

    const store = configureStore({
      reducer: { cache: cacheSlice.reducer },
      middleware: (gdm) => gdm({ serializableCheck: false }),
    })

    // the updateQueryData pattern (2.x buildThunks.ts:407-462): select
    // current data, produce patches outside the store, dispatch them, and
    // return an undo that dispatches the inverse set
    const currentData = store.getState().cache.entries.q1.data
    const [, patches, inversePatches] = patchSupport.produceWithPatches(
      currentData,
      updateRecipe,
    )
    store.dispatch(cacheSlice.actions.patchApplied({ key: 'q1', patches }))

    const untouchedEntry = store.getState().cache.entries.q2
    expect(store.getState().cache.entries.q1.data).toEqual({
      items: ['a', 'b'],
      count: 2,
    })
    expect(untouchedEntry.data).toEqual({ items: ['z'], count: 1 })

    store.dispatch(
      cacheSlice.actions.patchApplied({ key: 'q1', patches: inversePatches }),
    )

    expect(store.getState().cache.entries.q1.data).toEqual({
      items: ['a'],
      count: 1,
    })
    expect(store.getState().cache.entries.q2).toBe(untouchedEntry)
  })

  test('current and original are identity for non-drafts', () => {
    const value = { a: 1 }
    expect(adapter.current(value)).toBe(value)
    expect(adapter.original(value)).toBe(value)
  })
})

describe('draft inspection inside case reducers', () => {
  const draftCases = [
    ['immerAdapterWithPatches', immerAdapterWithPatches],
    ['mutativeAdapterWithPatches', mutativeAdapterWithPatches],
  ] as const

  test.each(draftCases)(
    '%s: current snapshots the changed value, original returns the base',
    (_name, adapter: ImmutabilityAdapter) => {
      const createAppSlice = buildCreateSlice({ immutability: adapter })

      let seenCurrent: Data | undefined
      let seenOriginal: Data | undefined
      let currentWasDraft: boolean | undefined

      const slice = createAppSlice({
        name: 'probe',
        initialState: { items: ['a'], count: 1 } as Data,
        reducers: {
          bumped(state) {
            state.count = 99
            seenCurrent = adapter.current(state)
            seenOriginal = adapter.original(state)
            currentWasDraft = adapter.isDraft(seenCurrent)
          },
        },
      })

      slice.reducer(undefined, slice.actions.bumped())

      expect(seenCurrent).toEqual({ items: ['a'], count: 99 })
      expect(currentWasDraft).toBe(false)
      expect(seenOriginal).toEqual({ items: ['a'], count: 1 })
    },
  )
})
