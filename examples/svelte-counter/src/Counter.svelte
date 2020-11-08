
<script lang="ts">
    export let id: number = null;
    import { onMount } from 'svelte';
    import { QueryStatus } from '@rtk-incubator/simple-query/dist';
    import { counterApi } from './services/counter';
    import { store } from './store';

    const { incrementCountById, decrementCountById } = counterApi.mutationActions;

    let incrementStatus, decrementStatus;
    $: ({ data, status: getStatus, error } = counterApi.selectors.query.getCountById(id)($store));
    $: ({ status: incrementStatus } = counterApi.selectors.query.getCountById(id)($store));
    $: ({ status: decrementStatus } = counterApi.selectors.query.getCountById(id)($store));

    $: loading = [incrementStatus, decrementStatus, getStatus].some(status => status === QueryStatus.pending);

    onMount(() => {
        store.dispatch(counterApi.queryActions.getCountById(id));
    });
</script>

<style>
    main {
        padding: 0.5em;
    }

    .count {
        color: #a74524;
        text-transform: uppercase;
        font-size: 2em;
        font-weight: 100;
        margin-right: 20px;
    }

</style>

<main>
    <span class="count">{data?.count || 0}</span>
    <button on:click={() => store.dispatch(incrementCountById({ id, amount: 1 }, { track: false }))} disabled={loading}>Increase</button>
    <button on:click={() => store.dispatch(decrementCountById({ id, amount: 1 }, { track: false }))} disabled={loading}>Decrease</button>
    <small>(id: {id})</small>

</main>
