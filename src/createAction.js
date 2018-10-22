import identity from './identity'
import isFunction from './isFunction'

export function createAction(type, payloadCreator) {
  if (!isFunction(payloadCreator)) {
    payloadCreator = identity
  }

  const action = (...args) => ({
    type,
    payload: payloadCreator(...args)
  })
  action.toString = () => `${type}`
  return action
}

export const getType = action => `${action}`
