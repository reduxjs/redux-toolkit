import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { api } from './app/services/posts'
import { ChakraProvider } from '@chakra-ui/react'

import { BrowserRouter } from 'react-router-dom'
import { worker } from './mocks/browser'
import { ApiProvider } from '@reduxjs/toolkit/query/react'

// Initialize the msw worker, wait for the service worker registration to resolve, then mount
worker.start({ quiet: true }).then(() => {
  return ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  ).render(
    <React.StrictMode>
      <ApiProvider api={api}>
        <ChakraProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ChakraProvider>
      </ApiProvider>
    </React.StrictMode>
  )
})
