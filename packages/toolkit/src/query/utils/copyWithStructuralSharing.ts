import { isPlainObject as _iPO } from '../core/rtkImports'

// remove type guard
const isPlainObject: (_: any) => boolean = _iPO

export function copyWithStructuralSharing<T>(oldObj: any, newObj: T): T
export function copyWithStructuralSharing(oldObj: any, newObj: any): any {
  if (
    oldObj === newObj ||
    !(
      (isPlainObject(oldObj) && isPlainObject(newObj)) ||
      (Array.isArray(oldObj) && Array.isArray(newObj))
    )
  ) {
    return newObj
  }
  // Use getOwnPropertyNames to include keys with undefined values
  // This is important for query args that may contain explicit undefined values
  const newKeys = Object.getOwnPropertyNames(newObj)
  const oldKeys = Object.getOwnPropertyNames(oldObj)

  let isSameObject = newKeys.length === oldKeys.length
  const mergeObj: any = Array.isArray(newObj) ? [] : {}
  for (const key of newKeys) {
    mergeObj[key] = copyWithStructuralSharing(oldObj[key], newObj[key])
    if (isSameObject) isSameObject = oldObj[key] === mergeObj[key]
  }
  return isSameObject ? oldObj : mergeObj
}
