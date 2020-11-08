<script lang="ts">
    import { onMount } from 'svelte';
    import { QueryStatus } from '@rtk-incubator/simple-query/dist';
    import { counterApi } from './services/counter';
    import { store } from './store';
    import Counter from './Counter.svelte'

    let counters = [] as number[];

    const { incrementCount, decrementCount } = counterApi.mutationActions;

    $: ({ data, status, error } = counterApi.selectors.query.getCount()($store));

    $: loading = status === QueryStatus.pending;

    let getCount = () => {};

    onMount(async () => {
        ({ refetch: getCount } = store.dispatch(counterApi.queryActions.getCount()));
        store.dispatch(counterApi.queryActions.getAbsoluteTest())
        store.dispatch(counterApi.queryActions.getError());
        store.dispatch(counterApi.queryActions.getNetworkError());
        store.dispatch(counterApi.queryActions.getHeaderError());
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
    <button on:click={() => store.dispatch(incrementCount(1, { track: false }))}>Increase</button>
    <button on:click={() => store.dispatch(decrementCount(1, { track: false }))}>Decrease</button>
    <button on:click={getCount} disabled={loading}>Refetch count</button>

    <hr />
    <h3>Custom counters!</h3><button on:click={() => { counters = [...counters, counters.length + 1] }}>Add counter</button>

    {#each counters as id}
		<Counter {id} />
	{/each}
</main>
