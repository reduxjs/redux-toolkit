<script lang="ts">
    export let id: string = null;
    import { onMount } from 'svelte';
    import { QueryStatus } from '@rtk-incubator/rtk-query/dist';
    import { counterApi } from './services/counter';
    import { globalPollingEnabled, store } from './store';
    import { pollingOptions } from './utils/pollingOptions';

    const { actions, selectors } = counterApi;

    // Set the initial to random option
    let pollingInterval = pollingOptions[Math.floor(Math.random() * pollingOptions.length)].value;
    let queryRef, lastIncrementRequestId, lastDecrementRequestId, incrementStatus, decrementStatus;

    $: ({ data, status: getStatus } = selectors.getCountById(id)($store));
    $: ({ status: decrementStatus } = selectors.decrementCountById(lastDecrementRequestId)($store));
    $: ({ status: incrementStatus } = selectors.incrementCountById(lastIncrementRequestId)($store));

    $: loading = [incrementStatus, decrementStatus, getStatus].some((status) => status === QueryStatus.pending);

    $: queryRef?.updateSubscriptionOptions({ pollingInterval: $globalPollingEnabled ? pollingInterval : 0 });

    onMount(() => {
        queryRef = store.dispatch(actions.getCountById(id));
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

    .highlight {
        background: #e9ffeb;
    }
</style>

<main class={loading ? 'highlight' : ''}>
    <span class="count">{data?.count || 0}</span>
    <button
        on:click={() => ({ requestId: lastIncrementRequestId } = store.dispatch(actions.incrementCountById({ id, amount: 1 }, { track: true })))}
        disabled={loading}>+</button>
    <button
        on:click={() => ({ requestId: lastDecrementRequestId } = store.dispatch(actions.decrementCountById({ id, amount: 1 }, { track: true })))}
        disabled={loading}>-</button>
    <select bind:value={pollingInterval}>
        {#each pollingOptions as { value, label }}
            <option {value}>{label}</option>
        {/each}
    </select>
</main>
