import type { StoreEnhancer } from 'redux'

export const shouldAutoBatch = 'RTK_autoBatch'

// Copied from https://github.com/feross/queue-microtask
let promise: Promise<any>
const queueMicrotaskShim =
  typeof queueMicrotask === 'function'
    ? queueMicrotask.bind(typeof window !== 'undefined' ? window : global)
    : // reuse resolved promise, and allocate it lazily
      (cb: () => void) =>
        (promise || (promise = Promise.resolve())).then(cb).catch((err: any) =>
          setTimeout(() => {
            throw err
          }, 0)
        )

export const autoBatchEnhancer =
  (): StoreEnhancer =>
  (next) =>
  (...args) => {
    const store = next(...args)

    let notifying = true
    let notificationQueued = false
    // let nextNotification: NodeJS.Timeout | undefined = undefined
    const listeners = new Set<() => void>()
    const notifyListeners = () => {
      //nextNotification = void
      notificationQueued = false
      listeners.forEach((l) => l())
    }

    return Object.assign({}, store, {
      subscribe(listener: () => void) {
        const wrappedListener: typeof listener = () => notifying && listener()
        const unsubscribe = store.subscribe(wrappedListener)
        listeners.add(listener)
        return () => {
          unsubscribe()
          listeners.delete(listener)
        }
      },
      dispatch(action: any) {
        try {
          notifying = !action?.meta?.[shouldAutoBatch]
          if (notifying) {
            notificationQueued = false
            // if (nextNotification) {
            //   nextNotification = void clearTimeout(nextNotification)
            // }
          } else {
            if (!notificationQueued) {
              notificationQueued = true
              queueMicrotaskShim(notifyListeners)
            }
            // nextNotification ||= setTimeout(
            //   notifyListeners,
            //   batchTimeout
            // ) as any
          }
          return store.dispatch(action)
        } finally {
          notifying = true
        }
      },
    })
  }
