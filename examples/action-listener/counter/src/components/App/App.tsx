import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import type { Unsubscribe } from '@reduxjs/toolkit'
import { setupThemeListeners } from '../../services/theme/listeners'
import { setupCounterListeners } from '../../services/counter/listeners'
import { ChangeThemeForm } from '../ChangeThemeForm/ChangeThemeForm'
import { CounterList } from '../CounterList/CounterList'
import { CreateCounterForm } from '../CreateCounterForm/CreateCounterForm'
import { store, startAppListening } from '../../store'

export function App() {
  useEffect(() => {
    const subscriptions: Unsubscribe[] = [
      setupCounterListeners(startAppListening),
      setupThemeListeners(startAppListening),
    ]

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [])

  return (
    <React.StrictMode>
      <Provider store={store}>
        <main className={'main'}>
          <header className="App-header">
            <h1>Counter example</h1>
          </header>
          <ChangeThemeForm />
          <CreateCounterForm />
          <CounterList />
        </main>
      </Provider>
    </React.StrictMode>
  )
}
