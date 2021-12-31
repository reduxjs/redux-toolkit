import { themeActions } from './slice'
import type { AppActionListenerMiddleware } from '../../store'

function onChangeColorScheme(
  action: ReturnType<typeof themeActions.changeColorScheme>
) {
  if (action.payload === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    document.documentElement.classList.add('dark')
  }
}

export function setupThemeListeners(
  actionListener: AppActionListenerMiddleware
) {
  return actionListener.addListener({
    actionCreator: themeActions.changeColorScheme,
    listener: onChangeColorScheme,
  })
}
