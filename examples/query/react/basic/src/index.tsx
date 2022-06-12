import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'

import App from './App'
import { setupStore } from './store'

const store = setupStore()

const reactRoot = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
reactRoot.render(
  <Provider store={store}>
    <App />
  </Provider>
)
