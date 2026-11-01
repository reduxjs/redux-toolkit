import type {
  ThunkDispatch,
  ActionCreatorWithoutPayload, // Workaround for API-Extractor
} from '@reduxjs/toolkit'
import { createAction } from './rtkImports'

export const INTERNAL_PREFIX = '__rtkq/'

const ONLINE = 'online'
const OFFLINE = 'offline'
const FOCUS = 'focus'
const FOCUSED = 'focused'
const VISIBILITYCHANGE = 'visibilitychange'

export const onFocus = /* @__PURE__ */ createAction(
  `${INTERNAL_PREFIX}${FOCUSED}`,
)
export const onFocusLost = /* @__PURE__ */ createAction(
  `${INTERNAL_PREFIX}un${FOCUSED}`,
)
export const onOnline = /* @__PURE__ */ createAction(
  `${INTERNAL_PREFIX}${ONLINE}`,
)
export const onOffline = /* @__PURE__ */ createAction(
  `${INTERNAL_PREFIX}${OFFLINE}`,
)

const actions = {
  onFocus,
  onFocusLost,
  onOnline,
  onOffline,
}

type AnyDispatch = ThunkDispatch<any, any, any>

// Each registered dispatch, with the number of `setupListeners` calls
// that are still subscribed for it.
const registeredDispatches = new Map<AnyDispatch, number>()

const dispatchToAll = (actionCreator: () => { type: string }) => {
  for (const dispatch of [...registeredDispatches.keys()]) {
    dispatch(actionCreator())
  }
}

const windowHandlers = {
  [FOCUS]: () => dispatchToAll(onFocus),
  [VISIBILITYCHANGE]: () => {
    if (window.document.visibilityState === 'visible') {
      dispatchToAll(onFocus)
    } else {
      dispatchToAll(onFocusLost)
    }
  },
  [ONLINE]: () => dispatchToAll(onOnline),
  [OFFLINE]: () => dispatchToAll(onOffline),
}

function updateWindowListeners(add: boolean) {
  Object.entries(windowHandlers).forEach(([event, handler]) => {
    if (add) {
      window.addEventListener(event, handler, false)
    } else {
      window.removeEventListener(event, handler)
    }
  })
}

/**
 * A utility used to enable `refetchOnMount` and `refetchOnReconnect` behaviors.
 * It requires the dispatch method from your store.
 * Calling `setupListeners(store.dispatch)` will configure listeners with the recommended defaults,
 * but you have the option of providing a callback for more granular control.
 *
 * @example
 * ```ts
 * setupListeners(store.dispatch)
 * ```
 *
 * @param dispatch - The dispatch method from your store
 * @param customHandler - An optional callback for more granular control over listener behavior
 * @returns Return value of the handler.
 * The default handler returns an `unsubscribe` method that can be called to remove the listeners.
 */
export function setupListeners(
  dispatch: ThunkDispatch<any, any, any>,
  customHandler?: (
    dispatch: ThunkDispatch<any, any, any>,
    actions: {
      onFocus: typeof onFocus
      onFocusLost: typeof onFocusLost
      onOnline: typeof onOnline
      onOffline: typeof onOffline
    },
  ) => () => void,
) {
  function defaultHandler() {
    if (typeof window === 'undefined' || !window.addEventListener) {
      return () => {}
    }

    if (registeredDispatches.size === 0) {
      updateWindowListeners(true)
    }
    registeredDispatches.set(
      dispatch,
      (registeredDispatches.get(dispatch) ?? 0) + 1,
    )

    let subscribed = true
    return () => {
      if (!subscribed) return
      subscribed = false

      const count = registeredDispatches.get(dispatch) ?? 0
      if (count > 1) {
        registeredDispatches.set(dispatch, count - 1)
        return
      }
      registeredDispatches.delete(dispatch)
      if (registeredDispatches.size === 0) {
        updateWindowListeners(false)
      }
    }
  }

  return customHandler ? customHandler(dispatch, actions) : defaultHandler()
}
