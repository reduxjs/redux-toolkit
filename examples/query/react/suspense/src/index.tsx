import { render } from 'react-dom'
import { Provider } from 'react-redux'

import App from './App'
import { store } from './store'

window.fetchFnErrorRate = 0

const rootElement = document.getElementById('root')
render(
  <Provider store={store}>
    <App />
  </Provider>,
  rootElement
)
