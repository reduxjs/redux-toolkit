import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { store } from './store'
import { Provider } from 'react-redux'
import { ChakraProvider } from '@chakra-ui/react'

import { worker } from './mocks/browser'

// Initialize the msw worker, wait for the service worker registration to resolve, then mount
worker.start({ quiet: true }).then(() =>
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Provider store={store}>
        <ChakraProvider>
          <App />
        </ChakraProvider>
      </Provider>
    </React.StrictMode>
  )
)
