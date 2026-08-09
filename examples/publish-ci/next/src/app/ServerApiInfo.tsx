import { configureStore } from '@reduxjs/toolkit'
import { timeApi } from '../app-core/services/times'

// Deliberately a Server Component. It imports the *core* RTK Query entry point
// (`@reduxjs/toolkit/query`, via `services/times`) rather than the React one,
// and builds a store on the server, so that CI fails if RTK stops being usable
// inside a React Server Component.
export function ServerApiInfo() {
  const store = configureStore({
    reducer: { [timeApi.reducerPath]: timeApi.reducer },
    middleware: (gDM) => gDM().concat(timeApi.middleware),
  })

  const state = store.getState()

  return (
    <div>
      <h2>Server Component</h2>
      <ul style={{ textAlign: 'left' }}>
        <li>
          Reducer path:{' '}
          <span data-testid="server-reducer-path">{timeApi.reducerPath}</span>
        </li>
        <li>
          Cached queries:{' '}
          <span data-testid="server-query-count">
            {Object.keys(state[timeApi.reducerPath].queries).length}
          </span>
        </li>
      </ul>
    </div>
  )
}
