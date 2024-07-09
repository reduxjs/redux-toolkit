import React = require('react')
import ReactDomClient = require('react-dom/client')
import ReactRedux = require('react-redux')
import App = require('./App.js')
import storeModule = require('./app/store.js')

import createRoot = ReactDomClient.createRoot
import Provider = ReactRedux.Provider
import store = storeModule.store

const container = document.getElementById('root')

if (container) {
  const root = createRoot(container)

  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>,
  )
} else {
  throw new Error(
    "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",
  )
}
