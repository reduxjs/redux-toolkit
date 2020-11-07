<script lang="ts">
    import { onMount } from 'svelte';
    import { QueryStatus } from '../../../dist';
    import { counterApi } from './services/counter';
    import { store } from './store';

    const { incrementCount, decrementCount } = counterApi.mutationActions;
    
    $: ({ data, status, error } = counterApi.selectors.query.getCount()($store));
    
    $: loading = status === QueryStatus.pending;
    
    let getCount = () => {};

    onMount(async () => {
        ({ refetch: getCount } = store.dispatch(counterApi.queryActions.getCount()));
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
    <button on:click={() => store.dispatch(incrementCount(1))}>Increase</button>
    <button on:click={() => store.dispatch(decrementCount(1))}>Decrease</button>
    <button on:click={getCount} disabled={loading}>Refetch count</button>
</main>
