# Dispatch benchmarks

Benchmarks for the per-dispatch cost of RTK and RTK Query (see #5497): `createAction.match`, `createSlice` reducers, the RTKQ middleware and reducers with 0/100/1000 cache entries, RTKQ actions that rewrite provided tags, and the listener middleware.

They use `vitest bench` with a separate config (`vitest.bench.config.mts`), so `pnpm test` does not run them.

## Running

The benchmarks import the **built** package from `dist`, with `NODE_ENV=production`. Vitest's module runner wraps every export of a transformed module in a getter, which would distort timings at this scale, so the config loads `dist` natively in Node. Rebuild after changing `src`:

```sh
cd packages/toolkit
pnpm build-only
pnpm bench
```

Run one group with `-t`, for example `pnpm bench -t listener`.

## Comparing two branches

Save results from one build under a label, then run another build with that label as the baseline. The baseline rows appear in the same tables, suffixed with `[label]`.

```sh
git switch master
pnpm build-only
BENCH_SAVE=master pnpm bench

git switch my-branch
pnpm build-only
BENCH_BASELINE=master pnpm bench
```

Results are written to `bench/results/<label>/`, which is gitignored. Absolute numbers vary between machines and runtimes, so only compare runs from the same machine.
