export type Selector<S, R> = (state: S) => R

export function createSliceSelector<S = any>(): Selector<S, S>
export function createSliceSelector<
  S extends { [key: string]: any } = any,
  R = any
>(slice: string): Selector<S, R>

export function createSliceSelector<S, R>(slice?: string) {
  if (!slice) {
    return (state: S): S => state
  }
  return (state: { [key: string]: any }): R => state[slice]
}

export function createSelectorName(slice: string): string {
  if (!slice) {
    return 'getState'
  }
  return camelize(`get ${slice}`)
}

function camelize(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    })
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
}
