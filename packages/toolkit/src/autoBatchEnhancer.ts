import type { StoreEnhancer } from 'redux'

export const autoBatch = 'ReduxToolkit_autoBatch'

export const autoBatchEnhancer =
  (batchTimeout: number = 0): StoreEnhancer =>
  (next) =>
  (...args) => {
    const store = next(...args)

    let notifying = true
    let nextNotification: NodeJS.Timeout | undefined = undefined
    const listeners = new Set<() => void>()
    const notifyListeners = () => {
      nextNotification = void listeners.forEach((l) => l())
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
          notifying = !action?.meta?.[autoBatch]
          if (notifying) {
            if (nextNotification) {
              nextNotification = void clearTimeout(nextNotification)
            }
          } else {
            nextNotification ||= setTimeout(
              notifyListeners,
              batchTimeout
            ) as any
          }
          return store.dispatch(action)
        } finally {
          notifying = true
        }
      },
    })
  }
