import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../../app/store'

export type PollingConfig = {
  enabled: boolean
  interval: number
}

export type SliceState = {
  enabled: boolean
  apps: {
    [key: string]: PollingConfig
  }
}

export const initialState: SliceState = {
  enabled: true,
  apps: {
    counters: {
      enabled: true,
      interval: 0,
    },
    times: {
      enabled: true,
      interval: 0,
    },
    posts: {
      enabled: true,
      interval: 0,
    },
  },
}

export type PollingAppKey = keyof (typeof initialState)['apps']

export const pollingSlice = createSlice({
  name: 'polling',
  initialState,
  reducers: (create) => {
    return {
      toggleGlobalPolling: create.reducer((state) => {
        state.enabled = !state.enabled
      }),
      updatePolling: create.reducer<{
        app: PollingAppKey
        enabled?: boolean
        interval?: number
      }>((state, { payload }) => {
        const { app, ...rest } = payload
        state.apps[app] = {
          ...state.apps[app],
          ...rest,
        }
      }),
    }
  },
  selectors: {
    selectGlobalPollingEnabled: (pollingState) => pollingState.enabled,
  },
})

export const {
  actions,
  caseReducers,
  getInitialState,
  getSelectors,
  injectInto,
  name,
  reducer,
  reducerPath,
  selectSlice,
  selectors,
} = pollingSlice

export const {
  toggleGlobalPolling: _toggleGlobalPolling,
  updatePolling: _updatePolling,
} = caseReducers

export const { toggleGlobalPolling, updatePolling } = pollingSlice.actions

export const { selectGlobalPollingEnabled } = selectors

export const { unwrapped } = selectGlobalPollingEnabled

export const selectPollingConfigByApp = (
  state: RootState,
  app: PollingAppKey,
) => state.polling.apps[app]
