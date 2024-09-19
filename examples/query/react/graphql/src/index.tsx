import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { api } from './app/services/posts'
import { ChakraProvider } from '@chakra-ui/react'

import { worker } from './mocks/browser'
import { ApiProvider } from '@reduxjs/toolkit/query/react'

// Initialize the msw worker, wait for the service worker registration to resolve, then mount
async function StartApp(){
  try {
    await worker.start({ quiet: true })
  } catch (error) {
    console.log("error starting msw worker",error)
  }
    const rootElement = document.getElementById('root') as HTMLElement;
    if(rootElement){
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <ApiProvider api={api}>
            <ChakraProvider>
              <App />
            </ChakraProvider>
          </ApiProvider>
        </React.StrictMode>
      )
    }else throw new Error("root element not found")
}
StartApp()
