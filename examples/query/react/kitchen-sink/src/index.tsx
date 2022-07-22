import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { store } from './app/store'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { worker } from './mocks/browser'

// Initialize the msw worker, wait for the service worker registration to resolve, then mount
async function render() {
  if (process.env.NODE_ENV === 'development') {
    await worker.start()
  }

  const rootNode = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  )

  rootNode.render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </React.StrictMode>
  )
}

render()
