import isPlainObject from './isPlainObject'
import { Middleware } from 'redux'

/**
 * Returns true if the passed value is "plain", i.e. a value that is either
 * directly JSON-serializable (boolean, number, string, array, plain object)
 * or `undefined`.
 *
 * @param val The value to check.
 */
export function isPlain(val: any) {
  return (
    typeof val === 'undefined' ||
    val === null ||
    typeof val === 'string' ||
    typeof val === 'boolean' ||
    typeof val === 'number' ||
    Array.isArray(val) ||
    isPlainObject(val)
  )
}

const NON_SERIALIZABLE_STATE_MESSAGE = [
  'A non-serializable value was detected in the state, in the path: `%s`. Value: %o',
  'Take a look at the reducer(s) handling this action type: %s.',
  '(See https://redux.js.org/faq/organizing-state#can-i-put-functions-promises-or-other-non-serializable-items-in-my-store-state)'
].join('\n')

const NON_SERIALIZABLE_ACTION_MESSAGE = [
  'A non-serializable value was detected in an action, in the path: `%s`. Value: %o',
  'Take a look at the logic that dispatched this action:  %o.',
  '(See https://redux.js.org/faq/actions#why-should-type-be-a-string-or-at-least-serializable-why-should-my-action-types-be-constants)'
].join('\n')

interface NonSerializableValue {
  keyPath: string
  value: unknown
}

export function findNonSerializableValue(
  value: unknown,
  path: ReadonlyArray<string> = [],
  isSerializable: (value: unknown) => boolean = isPlain
): NonSerializableValue | false {
  let foundNestedSerializable: NonSerializableValue | false

  if (!isSerializable(value)) {
    return {
      keyPath: path.join('.') || '<root>',
      value: value
    }
  }

  if (typeof value !== 'object' || value === null) {
    return false
  }

  for (const property of Object.keys(value)) {
    const nestedPath = path.concat(property)
    const nestedValue: unknown = (value as any)[property]

    if (!isSerializable(nestedValue)) {
      return {
        keyPath: nestedPath.join('.'),
        value: nestedValue
      }
    }

    if (typeof nestedValue === 'object') {
      foundNestedSerializable = findNonSerializableValue(
        nestedValue,
        nestedPath,
        isSerializable
      )

      if (foundNestedSerializable) {
        return foundNestedSerializable
      }
    }
  }

  return false
}

/**
 * Options for `createSerializableStateInvariantMiddleware()`.
 */
export interface SerializableStateInvariantMiddlewareOptions {
  /**
   * The function to check if a value is considered serializable. This
   * function is applied recursively to every value contained in the
   * state. Defaults to `isPlain()`.
   */
  isSerializable?: (value: any) => boolean
}

/**
 * Creates a middleware that, after every state change, checks if the new
 * state is serializable. If a non-serializable value is found within the
 * state, an error is printed to the console.
 *
 * @param options Middleware options.
 */
export function createSerializableStateInvariantMiddleware(
  options: SerializableStateInvariantMiddlewareOptions = {}
): Middleware {
  const { isSerializable = isPlain } = options

  return storeAPI => next => action => {
    const foundActionNonSerializableValue = findNonSerializableValue(
      action,
      [],
      isSerializable
    )

    if (foundActionNonSerializableValue) {
      const { keyPath, value } = foundActionNonSerializableValue

      console.error(NON_SERIALIZABLE_ACTION_MESSAGE, keyPath, value, action)
    }

    const result = next(action)

    const state = storeAPI.getState()

    const foundStateNonSerializableValue = findNonSerializableValue(state)

    if (foundStateNonSerializableValue) {
      const { keyPath, value } = foundStateNonSerializableValue

      console.error(NON_SERIALIZABLE_STATE_MESSAGE, keyPath, value, action.type)
    }

    return result
  }
}
