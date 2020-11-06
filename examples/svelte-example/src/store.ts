import { configureStore } from '@reduxjs/toolkit';
import { counterApi } from './services/counter';

export const store = configureStore({
    reducer: {
        counterApi: counterApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(counterApi.middleware),
});
