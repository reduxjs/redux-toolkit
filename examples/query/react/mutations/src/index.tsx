import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { store } from './store'
import { Provider } from 'react-redux'
import { ChakraProvider } from '@chakra-ui/react'
import { worker } from './mocks/browser'

// Initialize the msw worker, wait for the service worker registration to resolve, then mount
async function StartApp(){
  try {
    await worker.start({ quiet: true })
  } catch (error) {
    console.log("error starting the mws worker")
    
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
    }else throw new Error("rootElement not found")
}
StartApp()

