import { enableMapSet } from 'immer'
import { immerAdapterWithPatches } from '../immerAdapter'
import { runImmutabilityAdapterConformance } from './conformance'
import { mutativeAdapterWithPatches } from './mutativeAdapter'

// The Immer adapter reports Map and Set as draftable, but Immer only drafts
// them after the app enables its MapSet plugin.
enableMapSet()

const runner = { describe, it, expect }

runImmutabilityAdapterConformance('immer', immerAdapterWithPatches, runner)

runImmutabilityAdapterConformance(
  'mutative',
  mutativeAdapterWithPatches,
  runner,
)

describe('createApi with the Mutative adapter', () => {
  it.todo('updateQueryData and undo with two overlapping optimistic updates')
  it.todo('patchQueryData')
  it.todo('subscription sync runs without console warnings')
})
