import { themeActions } from './slice'

export function onChangeColorScheme(
  action: ReturnType<typeof themeActions.changeColorScheme>
) {
  if (action.payload === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    document.documentElement.classList.add('dark')
  }
}
