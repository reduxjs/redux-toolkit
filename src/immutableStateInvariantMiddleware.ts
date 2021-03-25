import { Middleware } from 'redux'
import { getTimeMeasureUtils } from './utils'

type EntryProcessor = (key: string, value: any) => any

const isProduction: boolean = process.env.NODE_ENV === 'production'
const prefix: string = 'Invariant failed'

// Throw an error if the condition fails
// Strip out error messages for production
// > Not providing an inline default argument for message as the result is smaller
function invariant(condition: any, message?: string) {
  if (condition) {
    return
  }
  // Condition not passed

  // In production we strip the message but still throw
  if (isProduction) {
    throw new Error(prefix)
  }

  // When not in production we allow the message to pass through
  // *This block will be removed in production builds*
  throw new Error(`${prefix}: ${message || ''}`)
}

function stringify(
  obj: any,
  serializer?: EntryProcessor,
  indent?: string | number,
  decycler?: EntryProcessor
): string {
  return JSON.stringify(obj, getSerialize(serializer, decycler), indent)
}

function getSerialize(
  serializer?: EntryProcessor,
  decycler?: EntryProcessor
): EntryProcessor {
  let stack: any[] = [],
    keys: any[] = []

  if (!decycler)
    decycler = function(_: string, value: any) {
      if (stack[0] === value) return '[Circular ~]'
      return (
        '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']'
      )
    }

  return function(this: any, key: string, value: any) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this)
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this)
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key)
      if (~stack.indexOf(value)) value = decycler!.call(this, key, value)
    } else stack.push(value)

    return serializer == null ? value : serializer.call(this, key, value)
  }
}

/**
 * The default `isImmutable` function.
 *
 * @public
 */
export function isImmutableDefault(value: unknown): boolean {
  return (
    typeof value !== 'object' || value === null || typeof value === 'undefined' // ||  Object.isFrozen(value)
  )
}

/** @public */
export function trackForMutations(
  isImmutable: IsImmutableFunc,
  ignorePaths: string[] | undefined,
  obj: any
) {
  const trackedProperties = trackProperties(isImmutable, ignorePaths, obj)
  return {
    detectMutations() {
      return detectMutations(isImmutable, ignorePaths, trackedProperties, obj)
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
  path: string = ''
) {
  const tracked: Partial<TrackedProperty> = { value: obj }

  if (!isImmutable(obj)) {
    tracked.children = {}

    for (const key in obj) {
      const childPath = path ? path + '.' + key : key // path.concat(key)
      if (ignorePaths.length && ignorePaths.indexOf(childPath) !== -1) {
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

interface TrackedItem {
  path: string
  trackedChildren: string[]
  value: any
  parent: any
}

class Queue<T> {
  private readonly queue: T[]
  private start: number
  private end: number

  constructor(array: T[] = []) {
    this.queue = array

    // pointers
    this.start = 0
    this.end = array.length
  }

  isEmpty() {
    return this.end === this.start
  }

  dequeue(): T {
    if (this.isEmpty()) {
      throw new Error('Queue is empty.')
    } else {
      return this.queue[this.start++]
    }
  }

  enqueue(value: T) {
    this.queue.push(value)
    this.end += 1
  }

  toString() {
    return `Queue (${this.end - this.start})`
  }

  [Symbol.iterator]() {
    let index = this.start
    return {
      next: () =>
        index < this.end
          ? {
              value: this.queue[index++]
            }
          : { done: true }
    }
  }
}

function tp2(
  isImmutable: IsImmutableFunc,
  ignorePaths: IgnorePaths = [],
  obj: Record<string, any>
) {
  /*
  const queue: TrackedItem[] = [
    {
      path: [],
      trackedChildren: [],
      value: obj,
      parent: null
    }
  ]
  */
  const queue = new Queue([
    {
      path: '',
      trackedChildren: [],
      value: obj,
      parent: null
    } as TrackedItem
  ])
  const trackedValues: Record<string, TrackedItem> = {}

  while (!queue.isEmpty()) {
    const current = queue.dequeue() as TrackedItem
    const { path, value, trackedChildren } = current

    const pathString = path
    trackedValues[pathString] = current

    if (!isImmutable(value)) {
      for (const key in value) {
        const childPath = path ? path + '.' + key : key // path.concat(key)
        if (ignorePaths.length && ignorePaths.indexOf(childPath) !== -1) {
          continue
        }

        trackedChildren.push(key)

        queue.enqueue({
          path: childPath,
          value: value[key],
          parent: value,
          trackedChildren: []
        })
      }
    }

    /*
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
    */
  }
  //return tracked as TrackedProperty
  return trackedValues
}

type IgnorePaths = string[]

function detectMutations(
  isImmutable: IsImmutableFunc,
  ignorePaths: IgnorePaths = [],
  trackedProperty: TrackedProperty,
  obj: any,
  sameParentRef: boolean = false,
  path: string = ''
): { wasMutated: boolean; path?: string } {
  const prevObj = trackedProperty ? trackedProperty.value : undefined

  const sameRef = prevObj === obj

  if (sameParentRef && !sameRef && !Number.isNaN(obj)) {
    return { wasMutated: true, path }
  }

  if (isImmutable(prevObj) || isImmutable(obj)) {
    return { wasMutated: false }
  }

  const keysToDetect = new Set<string>()
  for (let key in trackedProperty.children) {
    keysToDetect.add(key)
  }
  for (let key in obj) {
    keysToDetect.add(key)
  }

  /*
  // Gather all keys from prev (tracked) and after objs
  const keysToDetect: Record<string, boolean> = {}
  Object.keys(trackedProperty.children).forEach(key => {
    keysToDetect[key] = true
  })
  Object.keys(obj).forEach(key => {
    keysToDetect[key] = true
  })
  */

  // const keys = keysToDetect.entries()
  // for (let i = 0; i < keys.length; i++) {
  for (let key of keysToDetect) {
    // const key = keys[i]
    const childPath = path ? path + '.' + key : key // path.concat(key)
    if (ignorePaths.length && ignorePaths.indexOf(childPath) !== -1) {
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

function dm2(
  isImmutable: IsImmutableFunc,
  ignorePaths: IgnorePaths = [],
  trackedValues: Record<string, TrackedItem>,
  obj: any
  // sameParentRef: boolean = false,
  // path: string[] = []
): { wasMutated: boolean; path?: string } {
  const queue = new Queue([
    {
      path: '',
      trackedChildren: [],
      value: obj,
      parent: null
    } as TrackedItem
  ])

  while (!queue.isEmpty()) {
    const current = queue.dequeue()!
    const { path, value, parent } = current

    const pathString = path

    let prevValue = undefined
    let prevParent = undefined
    let prevTrackedChildren: string[] = []
    const previousEntry = trackedValues[pathString]

    if (previousEntry) {
      prevValue = previousEntry.value
      prevParent = previousEntry.parent
      prevTrackedChildren = previousEntry.trackedChildren
    }

    /*
    const {
      value: prevValue,
      parent: prevParent,
      trackedChildren: prevTrackedChildren = []
    } = previousEntry
    */

    const sameRef = prevValue === value
    const sameParentRef = prevParent === parent

    if ((sameParentRef || !previousEntry) && !sameRef && !Number.isNaN(value)) {
      return { wasMutated: true, path }
    }

    if (isImmutable(prevValue) || isImmutable(value)) {
      continue
    }

    const keys = new Set<string>(prevTrackedChildren)
    Object.keys(value).forEach(key => {
      keys.add(key)
    })

    for (let key of keys) {
      const childPath = path ? path + '.' + key : key // path.concat(key)
      if (ignorePaths.length && ignorePaths.indexOf(childPath) !== -1) {
        continue
      }

      queue.enqueue({
        path: childPath,
        value: value[key],
        parent: value,
        trackedChildren: []
      })
    }
  }

  return { wasMutated: false }
}

/** @public */
export function tm2(
  isImmutable: IsImmutableFunc,
  ignorePaths: string[] | undefined,
  obj: any
) {
  const trackedProperties = tp2(isImmutable, ignorePaths, obj)
  return {
    detectMutations() {
      return dm2(isImmutable, ignorePaths, trackedProperties, obj)
    }
  }
}

type IsImmutableFunc = (value: any) => boolean

/**
 * Options for `createImmutableStateInvariantMiddleware()`.
 *
 * @public
 */
export interface ImmutableStateInvariantMiddlewareOptions {
  /**
    Callback function to check if a value is considered to be immutable.
    This function is applied recursively to every value contained in the state.
    The default implementation will return true for primitive types 
    (like numbers, strings, booleans, null and undefined).
   */
  isImmutable?: IsImmutableFunc
  /** 
    An array of dot-separated path strings that match named nodes from 
    the root state to ignore when checking for immutability.
    Defaults to undefined
   */
  ignoredPaths?: string[]
  /** Print a warning if checks take longer than N ms. Default: 32ms */
  warnAfter?: number
  // @deprecated. Use ignoredPaths
  ignore?: string[]
  trackFunction?: typeof trackForMutations
}

/**
 * Creates a middleware that checks whether any state was mutated in between
 * dispatches or during a dispatch. If any mutations are detected, an error is
 * thrown.
 *
 * @param options Middleware options.
 *
 * @public
 */
export function createImmutableStateInvariantMiddleware(
  options: ImmutableStateInvariantMiddlewareOptions = {}
): Middleware {
  if (process.env.NODE_ENV === 'production') {
    return () => next => action => next(action)
  }

  let {
    isImmutable = isImmutableDefault,
    ignoredPaths,
    warnAfter = 32,
    ignore,
    trackFunction = trackForMutations
  } = options

  // Alias ignore->ignoredPaths, but prefer ignoredPaths if present
  ignoredPaths = ignoredPaths || ignore

  const track = trackFunction.bind(null, isImmutable, ignoredPaths)

  return ({ getState }) => {
    let state = getState()
    let tracker = track(state)

    let result
    return next => action => {
      const measureUtils = getTimeMeasureUtils(
        warnAfter,
        'ImmutableStateInvariantMiddleware'
      )

      measureUtils.measureTime(() => {
        state = getState()

        result = tracker.detectMutations()
        // Track before potentially not meeting the invariant
        tracker = track(state)

        invariant(
          !result.wasMutated,
          `A state mutation was detected between dispatches, in the path '${result.path ||
            ''}'.  This may cause incorrect behavior. (https://redux.js.org/troubleshooting#never-mutate-reducer-arguments)`
        )
      })

      const dispatchedAction = next(action)

      measureUtils.measureTime(() => {
        state = getState()

        result = tracker.detectMutations()
        // Track before potentially not meeting the invariant
        tracker = track(state)

        result.wasMutated &&
          invariant(
            !result.wasMutated,
            `A state mutation was detected inside a dispatch, in the path: ${result.path ||
              ''}. Take a look at the reducer(s) handling the action ${stringify(
              action
            )}. (https://redux.js.org/troubleshooting#never-mutate-reducer-arguments)`
          )
      })

      measureUtils.warnIfExceeded()

      return dispatchedAction
    }
  }
}
