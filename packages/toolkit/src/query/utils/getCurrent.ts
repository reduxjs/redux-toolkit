import type { Draft } from 'immer'
import { current, isDraft } from './immerImports'

export function getCurrent<T>(value: T | Draft<T>): T {
  return (isDraft(value) ? current(value as Draft<T>) : value) as T
}
