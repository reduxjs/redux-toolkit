import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

type PollingConfig = {
  enabled: boolean;
  interval: number;
};

type SliceState = {
  enabled: boolean;
  apps: {
    [key: string]: PollingConfig;
  };
};

const initialState: SliceState = {
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
};

type PollingAppKey = keyof typeof initialState['apps'];

const slice = createSlice({
  name: 'polling',
  initialState,
  reducers: {
    toggleGlobalPolling(state) {
      state.enabled = !state.enabled;
    },
    updatePolling(
      state,
      {
        payload,
      }: PayloadAction<{
        app: PollingAppKey;
        enabled?: boolean;
        interval?: number;
      }>
    ) {
      const { app, ...rest } = payload;
      state.apps[app] = {
        ...state.apps[app],
        ...rest,
      };
    },
  },
});

export const { toggleGlobalPolling, updatePolling } = slice.actions;

export default slice.reducer;

export const selectGlobalPollingEnabled = (state: RootState) => state.polling.enabled;
export const selectPollingConfigByApp = (state: RootState, app: PollingAppKey) => state.polling.apps[app];
