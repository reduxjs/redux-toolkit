<script lang="ts">
    import { onMount } from 'svelte';
    import { counterApi } from './services/counter';
    import { globalPollingEnabled, store } from './store';
    import Counter from './Counter.svelte';
    import { nanoid } from '@reduxjs/toolkit';

    const { endpoints } = counterApi;

    let counters: string[] = [];
    let spookyMode = true;

    let getCount = () => {};
    let queryRef;

    onMount(async () => {
        queryRef = { refetch: getCount } = store.dispatch(endpoints.getCount.initiate());
    });

    $: ({ data } = endpoints.getCount.select()($store));
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

    .button-link {
        background: none;
        border: none;
        padding: 0;
        color: #069;
        text-decoration: underline;
        cursor: pointer;
    }

    .stop {
        margin-top: 150px;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>

<main>
    <h1>{data?.count || 0}</h1>
    <button on:click={() => store.dispatch(endpoints.incrementCount.initiate(1, { track: false }))}>Increase</button>
    <button on:click={() => store.dispatch(endpoints.decrementCount.initiate(1, { track: false }))}>Decrease</button>

    <hr />
    <h3>Haunted counters?</h3>
    <p><small>We heard that any counters you might add below are haunted! </small></p>
    <button
        on:click={() => {
            counters = [...counters, nanoid()];
        }}>Add counter</button>
    {#if counters.length >= 2}
        <div>
            <button class="button-link" on:click={() => globalPollingEnabled.set(!$globalPollingEnabled)}>Turn
                {$globalPollingEnabled ? 'off' : 'on'}
                polling</button>
        </div>
    {/if}

    {#each counters as id}
        <Counter {id} />
    {/each}

    {#if counters.length >= 1}
        <div class="stop">
            <small>
                <button
                    class="button-link"
                    on:click|once={() => {
                        spookyMode = false;
                        store.dispatch(endpoints.stop.initiate()).then(() => {
                            spookyMode = false;
                            globalPollingEnabled.set(false);
                        });
                    }}>{spookyMode ? `I'm scared, stop it!` : `No fun`}
                </button>
            </small>
        </div>
    {/if}
</main>
