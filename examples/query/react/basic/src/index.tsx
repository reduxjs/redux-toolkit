import { render } from 'react-dom'
import { Provider } from 'react-redux'

import App from './App'
import { setUpStore } from './store'

const store = setUpStore()

const rootElement = document.getElementById('root')
render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
)
