import { FormEvent, ChangeEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../store'
import { themeActions, ThemeState } from '../../services/theme/slice'
import styles from './changeThemeForm.module.css'

function isChecked(theme: ThemeState): boolean {
  return theme.colorScheme === 'light'
}

export function ChangeThemeForm() {
  const theme = useAppSelector((state) => state.theme)
  const appDispatch = useAppDispatch()

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault()
  }

  const handleChange = (evt: ChangeEvent<HTMLInputElement>) => {
    appDispatch(
      themeActions.changeColorScheme(
        theme.colorScheme === 'light' ? 'dark' : 'light'
      )
    )
  }

  return (
    <form action="#" onSubmit={handleSubmit} className={styles.form}>
      <div className="form-group">
        <label htmlFor="theme-switch" className={styles.colorSchemeIcon}>
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {theme.colorScheme === 'light' ? (
              <>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </>
            ) : (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            )}
          </svg>
        </label>
        <label htmlFor="theme-switch" className="paper-switch">
          <input
            id="theme-switch"
            name="theme-switch"
            type="checkbox"
            checked={isChecked(theme)}
            onChange={handleChange}
          />
          <span className="paper-switch-slider round"></span>
        </label>
      </div>
    </form>
  )
}
