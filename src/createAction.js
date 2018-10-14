export function createAction(type) {
  const action = payload => ({
    type,
    payload
  })
  action.toString = () => `${type}`
  return action
}

export const getType = action => `${action}`
