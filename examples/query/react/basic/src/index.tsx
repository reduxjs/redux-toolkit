import { render } from 'react-dom'
import { Provider } from 'react-redux'

import App from './App'
import { createStore } from './store'

const store = createStore()

const rootElement = document.getElementById('root')
render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
)
