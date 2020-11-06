<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { QueryStatus } from '../../../dist';
    import { counterApi } from './services/counter';
    import { store } from './store';

    const { incrementCount, decrementCount } = counterApi.mutationActions;

    let data;
    let status;
    let error;

    const selector = counterApi.selectors.query.getCount();
    const unsubscribeSelector = store.subscribe(() => ({ data, status, error } = selector(store.getState())));

    const increment = () => store.dispatch(incrementCount(1));

    const decrement = () => store.dispatch(decrementCount(1));

    $: loading = status === QueryStatus.pending;

    let getCount, unsubscribe;

    onMount(async () => {
        ({ refetch: getCount, unsubscribe } = store.dispatch(counterApi.queryActions.getCount()));
    });

    onDestroy(() => {
        unsubscribe?.();
        unsubscribeSelector();
    });
</script>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>

<main>
    <h1>{data?.count || 0}</h1>
    <button on:click={increment}>Increase</button>
    <button on:click={decrement}>Decrease</button>
    <button on:click={getCount} disabled={loading}>Refetch count</button>
</main>
