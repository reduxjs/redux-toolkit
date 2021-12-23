import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import { Provider } from 'react-redux'
import { store } from './store'
import { themeActions } from './services/theme/slice'
import { ChangeThemeForm } from './components/ChangeThemeForm/ChangeThemeForm'
import { CounterList } from './components/CounterList/CounterList'
import { CreateCounterForm } from './components/CreateCounterForm/CreateCounterForm'

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  store.dispatch(themeActions.changeColorScheme('dark'))
}

ReactDOM.render(
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
  </React.StrictMode>,
  document.getElementById('root')
)
