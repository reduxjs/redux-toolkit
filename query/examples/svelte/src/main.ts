import App from './App.svelte';
import { worker } from './mocks/browser';

// Defer the load to ensure the worker has started.
const app = worker.start({ onUnhandledRequest: 'error' }).then(
    () =>
        new App({
            target: document.body,
        }),
);

export default app;
