import type { Unsubscribe } from '@reduxjs/toolkit'
import type { AppStartListening } from '../../store'
import { themeActions } from './slice'

function onChangeColorScheme(
  action: ReturnType<typeof themeActions.changeColorScheme>,
) {
  document.documentElement.classList.toggle('dark', action.payload !== 'light')
}

export function setupThemeListeners(
  startListening: AppStartListening,
): Unsubscribe {
  const listeners = [
    startListening({
      actionCreator: themeActions.changeColorScheme,
      effect: onChangeColorScheme,
    }),
  ]

  return () => listeners.forEach((unsubscribe) => unsubscribe())
}
