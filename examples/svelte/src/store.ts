import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { counterApi } from './services/counter';
import { Readable, readable, writable } from 'svelte/store';

const reduxStore = configureStore({
    reducer: {
        counterApi: counterApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(counterApi.middleware),
});

// Wrap the redux store with Svelte's readable store
const bindReduxStore = <T extends EnhancedStore<any, any, any>>(
    store: T,
): {
    subscribe: Readable<ReturnType<T['getState']>>['subscribe'];
    dispatch: T['dispatch'];
} => {
    const state = readable(store.getState(), (set) => {
        const unsubscribe = store.subscribe(() => {
            set(store.getState());
        });
        return unsubscribe;
    });

    return {
        subscribe: state.subscribe,
        dispatch: store.dispatch,
    };
};

export const store = bindReduxStore(reduxStore);

export const globalPollingEnabled = writable(true);
