import type { Draft } from '@reduxjs/toolkit'
import { current, isDraft } from '../utils/immerImports'

export function getCurrent<T>(value: T | Draft<T>): T {
  return (isDraft(value) ? current(value as Draft<T>) : value) as T
}
