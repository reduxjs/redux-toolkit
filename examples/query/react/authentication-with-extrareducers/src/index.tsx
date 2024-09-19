import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'

import App from './App'
import { store } from './app/store'

import { worker } from './mocks/browser'
import { Provider } from 'react-redux'

// Initialize the msw worker, wait for the service worker registration to resolve, then mount

async function StartApp(){
  try {
    await worker.start({quiet:true})
  } catch (error) {
    console.log("error starting worker",error)
  }
  const rootElement = document.getElementById('root') as HTMLElement;
  if(rootElement){
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <Provider store={store}>
          <ChakraProvider>
            <App />
          </ChakraProvider>
        </Provider>
      </React.StrictMode>
    )
  }else throw new Error("root element not found")
}


StartApp()


