import React from 'react'
import { render } from 'react-dom'
import { configureStore } from '@acemarke/redux-starter-kit'
import { Provider } from 'react-redux'
import App from './components/App'
import reducer from './reducers'

const store = configureStore({ reducer })

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
