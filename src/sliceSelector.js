export function createSliceSelector(slice) {
  if (!slice) {
    return state => state
  }
  return state => state[slice]
}

export function createSelectorName(slice) {
  if (!slice) {
    return 'getState'
  }
  return camelize(`get ${slice}`)
}

function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    })
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
}
