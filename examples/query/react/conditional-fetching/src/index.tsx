import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'

import App from './App'
import { store } from './store'

const reactRoot = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
reactRoot.render(
  <Provider store={store}>
    <App />
  </Provider>
)
