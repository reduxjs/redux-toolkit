import React from "react"
import { AppRegistry } from "react-native"
import { Provider } from "react-redux"
import { App } from "./App"
import { name as appName } from "./app.json"
import { store } from "./src/app/store"

AppRegistry.registerComponent(appName, () => () => (
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
))
