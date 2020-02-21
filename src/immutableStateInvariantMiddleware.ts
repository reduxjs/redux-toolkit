import invariant from 'invariant'
import stringify from 'json-stringify-safe'
import { Middleware } from 'redux'

const BETWEEN_DISPATCHES_MESSAGE = [
  'A state mutation was detected between dispatches, in the path `%s`.',
  'This may cause incorrect behavior.',
  '(http://redux.js.org/docs/Troubleshooting.html#never-mutate-reducer-arguments)'
].join(' ')

const INSIDE_DISPATCH_MESSAGE = [
  'A state mutation was detected inside a dispatch, in the path: `%s`.',
  'Take a look at the reducer(s) handling the action %s.',
  '(http://redux.js.org/docs/Troubleshooting.html#never-mutate-reducer-arguments)'
].join(' ')

export function isImmutableDefault(value: unknown): boolean {
  return (
    typeof value !== 'object' || value === null || typeof value === 'undefined'
  )
}

export function trackForMutations(
  isImmutable: IsImmutableFunc,
  ingorePaths: string[] | undefined,
  obj: any
) {
  const trackedProperties = trackProperties(isImmutable, ingorePaths, obj)
  return {
    detectMutations() {
      return detectMutations(isImmutable, ingorePaths, trackedProperties, obj)
    }
  }
}

interface TrackedProperty {
  value: any
  children: Record<string, any>
}

function trackProperties(
  isImmutable: IsImmutableFunc,
  ignorePaths: IgnorePaths = [],
  obj: Record<string, any>,
  path: string[] = []
) {
  const tracked: Partial<TrackedProperty> = { value: obj }

  if (!isImmutable(obj)) {
    tracked.children = {}

    for (const key in obj) {
      const childPath = path.concat(key)
      if (
        ignorePaths.length &&
        ignorePaths.indexOf(childPath.join('.')) !== -1
      ) {
        continue
      }

      tracked.children[key] = trackProperties(
        isImmutable,
        ignorePaths,
        obj[key],
        childPath
      )
    }
  }
  return tracked as TrackedProperty
}

type IgnorePaths = string[]

function detectMutations(
  isImmutable: IsImmutableFunc,
  ignorePaths: IgnorePaths = [],
  trackedProperty: TrackedProperty,
  obj: any,
  sameParentRef: boolean = false,
  path: string[] = []
): { wasMutated: boolean; path?: string[] } {
  const prevObj = trackedProperty ? trackedProperty.value : undefined

  const sameRef = prevObj === obj

  if (sameParentRef && !sameRef && !Number.isNaN(obj)) {
    return { wasMutated: true, path }
  }

  if (isImmutable(prevObj) || isImmutable(obj)) {
    return { wasMutated: false }
  }

  // Gather all keys from prev (tracked) and after objs
  const keysToDetect: Record<string, boolean> = {}
  Object.keys(trackedProperty.children).forEach(key => {
    keysToDetect[key] = true
  })
  Object.keys(obj).forEach(key => {
    keysToDetect[key] = true
  })

  const keys = Object.keys(keysToDetect)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const childPath = path.concat(key)
    if (ignorePaths.length && ignorePaths.indexOf(childPath.join('.')) !== -1) {
      continue
    }

    const result = detectMutations(
      isImmutable,
      ignorePaths,
      trackedProperty.children[key],
      obj[key],
      sameRef,
      childPath
    )

    if (result.wasMutated) {
      return result
    }
  }
  return { wasMutated: false }
}

type IsImmutableFunc = (value: any) => boolean
export interface ImmutableStateInvariantMiddlewareOptions {
  isImmutable?: IsImmutableFunc
  ignoredPaths?: string[]
}

export function createImmutableStateInvariantMiddleware(
  options: ImmutableStateInvariantMiddlewareOptions = {}
): Middleware {
  const { isImmutable = isImmutableDefault, ignoredPaths } = options
  const track = trackForMutations.bind(null, isImmutable, ignoredPaths)

  return ({ getState }) => {
    let state = getState()
    let tracker = track(state)

    let result
    return next => action => {
      state = getState()

      result = tracker.detectMutations()
      // Track before potentially not meeting the invariant
      tracker = track(state)

      invariant(
        !result.wasMutated,
        BETWEEN_DISPATCHES_MESSAGE,
        (result.path || []).join('.')
      )

      const dispatchedAction = next(action)
      state = getState()

      result = tracker.detectMutations()
      // Track before potentially not meeting the invariant
      tracker = track(state)

      result.wasMutated &&
        invariant(
          !result.wasMutated,
          INSIDE_DISPATCH_MESSAGE,
          (result.path || []).join('.'),
          stringify(action)
        )

      return dispatchedAction
    }
  }
}
