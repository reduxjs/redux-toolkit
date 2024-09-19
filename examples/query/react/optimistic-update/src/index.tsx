import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { api } from './app/services/posts';
import { ChakraProvider } from '@chakra-ui/react';

import { worker } from './mocks/browser';
import { ApiProvider } from '@reduxjs/toolkit/query/react';

// Initialize the msw worker, wait for the service worker registration to resolve, then mount
async function startApp() {
  try {
    await worker.start({ quiet: true });
  } catch (error) {
    console.error('Error starting MSW worker:', error);
  }

  const rootElement = document.getElementById('root')as HTMLElement;
  if (rootElement) {
    ReactDOM.createRoot(rootElement ).render(
      <React.StrictMode>
        <ApiProvider api={api}>
          <ChakraProvider>
            <App />
          </ChakraProvider>
        </ApiProvider>
      </React.StrictMode>
    );
  } else {
    console.error('Root element not found.');
  }
}

startApp();
