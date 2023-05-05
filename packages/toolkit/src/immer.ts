import {
  applyPatches,
  current,
  freeze,
  isDraft,
  isDraftable,
  original,
  produce,
  produceWithPatches,
} from 'immer'
import { defineImmutableHelpers } from './tsHelpers'

export const immutableHelpers = defineImmutableHelpers({
  createNextState: produce,
  createWithPatches: produceWithPatches,
  applyPatches,
  isDraft,
  isDraftable,
  original,
  current,
  freeze,
})
