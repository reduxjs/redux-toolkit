import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import { Provider } from 'react-redux'
import { store } from './store'
import { themeActions } from './services/theme/slice'

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    store.dispatch(themeActions.changeColorScheme('dark'))
  }
}

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
)
