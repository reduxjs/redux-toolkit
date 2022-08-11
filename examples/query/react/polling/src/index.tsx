import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'

import App from './App'
import { store } from './store'

const rootElement = document.getElementById('root')
const reactRoot = ReactDOM.createRoot(rootElement as HTMLElement)

reactRoot.render(
  <Provider store={store}>
    <App />
  </Provider>
)
