import type {
  ActionCreatorWithoutPayload,
  ThunkDispatch,
} from '@reduxjs/toolkit'
import { createAction } from './rtkImports'

export const INTERNAL_PREFIX = '__rtkq/'

const ONLINE = 'online'
const OFFLINE = 'offline'
const FOCUS = 'focus'
const FOCUSED = 'focused'
const VISIBILITYCHANGE = 'visibilitychange'

export const onFocus: ActionCreatorWithoutPayload<'__rtkq/focused'> =
  /* @__PURE__ */ createAction<void, '__rtkq/focused'>(
    `${INTERNAL_PREFIX}${FOCUSED}`,
  )
export const onFocusLost: ActionCreatorWithoutPayload<'__rtkq/unfocused'> =
  /* @__PURE__ */ createAction<void, '__rtkq/unfocused'>(
    `${INTERNAL_PREFIX}un${FOCUSED}`,
  )
export const onOnline: ActionCreatorWithoutPayload<'__rtkq/online'> =
  /* @__PURE__ */ createAction<void, '__rtkq/online'>(
    `${INTERNAL_PREFIX}${ONLINE}`,
  )
export const onOffline: ActionCreatorWithoutPayload<'__rtkq/offline'> =
  /* @__PURE__ */ createAction<void, '__rtkq/offline'>(
    `${INTERNAL_PREFIX}${OFFLINE}`,
  )

export type ListenerActions = {
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnReconnect-related behavior
   * {@link https://redux-toolkit.js.org/rtk-query/api/setupListeners}
   */
  onOnline: ActionCreatorWithoutPayload<'__rtkq/online'>
  onOffline: ActionCreatorWithoutPayload<'__rtkq/offline'>
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnFocus-related behavior
   * {@link https://redux-toolkit.js.org/rtk-query/api/setupListeners}
   */
  onFocus: ActionCreatorWithoutPayload<'__rtkq/focused'>
  onFocusLost: ActionCreatorWithoutPayload<'__rtkq/unfocused'>
}

const actions = {
  onFocus,
  onFocusLost,
  onOnline,
  onOffline,
} satisfies ListenerActions

let initialized = false

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
    actions: ListenerActions,
  ) => () => void,
) {
  function defaultHandler() {
    const [handleFocus, handleFocusLost, handleOnline, handleOffline] = [
      onFocus,
      onFocusLost,
      onOnline,
      onOffline,
    ].map((action) => () => dispatch(action()))

    const handleVisibilityChange = () => {
      if (window.document.visibilityState === 'visible') {
        handleFocus()
      } else {
        handleFocusLost()
      }
    }

    let unsubscribe = () => {
      initialized = false
    }

    if (!initialized) {
      if (typeof window !== 'undefined' && window.addEventListener) {
        const handlers = {
          [FOCUS]: handleFocus,
          [VISIBILITYCHANGE]: handleVisibilityChange,
          [ONLINE]: handleOnline,
          [OFFLINE]: handleOffline,
        }

        function updateListeners(add: boolean) {
          Object.entries(handlers).forEach(([event, handler]) => {
            if (add) {
              window.addEventListener(event, handler, false)
            } else {
              window.removeEventListener(event, handler)
            }
          })
        }
        // Handle focus events
        updateListeners(true)
        initialized = true

        unsubscribe = () => {
          updateListeners(false)
          initialized = false
        }
      }
    }

    return unsubscribe
  }

  return customHandler ? customHandler(dispatch, actions) : defaultHandler()
}
