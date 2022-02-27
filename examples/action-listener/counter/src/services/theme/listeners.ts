import { themeActions } from './slice'
import type { AppStartListening } from '../../store'
import { Unsubscribe } from '@reduxjs/toolkit'

function onChangeColorScheme(
  action: ReturnType<typeof themeActions.changeColorScheme>
) {
  document.documentElement.classList.toggle('dark', action.payload !== 'light')
}

export function setupThemeListeners(
  startListening: AppStartListening
): Unsubscribe {
  const listeners = [
    startListening({
      actionCreator: themeActions.changeColorScheme,
      effect: onChangeColorScheme,
    }),
  ]

  return () => listeners.forEach((unsubscribe) => unsubscribe())
}
