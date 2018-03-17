import React from 'react'
import { render } from 'react-dom'
import { configureStore } from '@acemarke/redux-starter-kit'
import { Provider } from 'react-redux'
import App from './components/App'
import reducer from './reducers'

const preloadedState = {
  todos: [
    {
      id: 0,
      text: 'Eat food',
      completed: true
    },
    {
      id: 1,
      text: 'Exercise',
      completed: false
    }
  ],
  visibilityFilter: 'SHOW_COMPLETED'
}

const store = configureStore({ reducer, preloadedState })

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
