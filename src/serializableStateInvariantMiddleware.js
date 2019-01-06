import isPlainObject from './isPlainObject'

export function isPlain(val) {
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

export function findNonSerializableValue(
  obj,
  path = [],
  isSerializable = isPlain
) {
  let foundNestedSerializable

  if (!isSerializable(obj)) {
    return { keyPath: path.join('.') || '<root>', value: obj }
  }

  for (let property in obj) {
    if (obj.hasOwnProperty(property)) {
      const nestedPath = path.concat(property)
      const nestedValue = obj[property]

      if (!isSerializable(nestedValue)) {
        return { keyPath: nestedPath.join('.'), value: nestedValue }
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
  }

  return false
}

export default function createSerializableStateInvariantMiddleware(
  options = {}
) {
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
