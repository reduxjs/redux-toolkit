/**
 * Returns true if the passed value is "plain" object, i.e. an object whose
 * protoype is the root `Object.prototype`. This includes objects created
 * using object literals, but not for instance for class instances.
 *
 * @param {any} value The value to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
export default function isPlainObject(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(Object.getPrototypeOf(value) || 0) === null
  )
}
