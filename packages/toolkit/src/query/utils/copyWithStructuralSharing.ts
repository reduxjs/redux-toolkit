import { isPlainObject as _iPO } from '../core/rtkImports'

// `isPlainObject` is a type guard; calling it through this widened signature
// keeps `oldObj` / `newObj` typed as `any` below instead of narrowing them.
// It must stay a type-level cast rather than a runtime alias
// (`const isPlainObject = _iPO`): Metro's inline-requires plugin rewrites such
// a top-level alias into standalone `require('@reduxjs/toolkit')` calls, which
// resolve through the `require` condition to the CJS build and bundle a second
// copy of RTK on React Native.
type RemoveTypeGuard = (value: any) => boolean

export function copyWithStructuralSharing<T>(oldObj: any, newObj: T): T
export function copyWithStructuralSharing(oldObj: any, newObj: any): any {
  if (
    oldObj === newObj ||
    !(
      ((_iPO as RemoveTypeGuard)(oldObj) &&
        (_iPO as RemoveTypeGuard)(newObj)) ||
      (Array.isArray(oldObj) && Array.isArray(newObj))
    )
  ) {
    return newObj
  }
  const newKeys = Object.keys(newObj)
  const oldKeys = Object.keys(oldObj)

  let isSameObject = newKeys.length === oldKeys.length
  const mergeObj: any = Array.isArray(newObj) ? [] : {}
  for (const key of newKeys) {
    mergeObj[key] = copyWithStructuralSharing(oldObj[key], newObj[key])
    if (isSameObject) isSameObject = oldObj[key] === mergeObj[key]
  }
  return isSameObject ? oldObj : mergeObj
}
