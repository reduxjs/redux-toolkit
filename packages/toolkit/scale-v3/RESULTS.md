# M5: Instantiation-cost measurements — v3 (spread-phantom) vs current builder API, real type surface

Measured 2026-07-29 on the `feature/rtk3-rtkq-prototype` worktree, TS 5.9.3.

## Method

- `gen-scale.mts` generates fixtures at 12/51/102/201 endpoints. Per entity: a byId
  query (`providesTags` callback), a list query (`transformResponse` + third-generic
  raw type, plus `upsert -> byId` in the upsert variants), and a mutation
  (`invalidatesTags` callback). 5 tag types, custom `reducerPath`.
- Five variants per size: `v3-core-upsert`, `v3-core-noupsert`, `v3-react`
  (reactify + every hook referenced once), `current-core` (builder API, `/query`
  entry, endpoint `initiate`/`select` referenced), `current-react` (builder API,
  `/query/react` entry, every hook referenced once).
- `measure.mts` runs one isolated `tsc -p --extendedDiagnostics` program per fixture
  (single `files` entry, `extends ../tsconfig.base.json` for the `@reduxjs/toolkit`
  → `./src/*` paths mapping, `types: ["node"]`).
- **Source mode**: each program type-checks the fixture *plus the whole `src/query`
  implementation* (~334 files). Absolute numbers therefore carry a large fixed floor
  shared by all variants. Slopes and variant deltas are the meaningful comparison.
  These numbers are NOT comparable to the architecture doc's fixtures, which ran
  against built `.d.ts` — but see the sanity check below.
- All 20 fixtures compile with **zero errors**. Instantiation counts are
  deterministic across runs; check times are noisy (±0.5s observed).

## Raw numbers

| fixture | instantiations | types | check (s) | total (s) |
|---|---|---|---|---|
| current-core-12 | 298,976 | 68,723 | 2.77 | 3.84 |
| current-react-12 | 412,556 | 90,114 | 3.82 | 4.86 |
| v3-core-noupsert-12 | 320,355 | 72,535 | 2.82 | 3.67 |
| v3-core-upsert-12 | 321,779 | 72,656 | 4.30 | 5.17 |
| v3-react-12 | 450,061 | 96,473 | 4.48 | 5.55 |
| current-core-51 | 337,781 | 74,027 | 3.07 | 3.99 |
| current-react-51 | 468,248 | 97,732 | 3.94 | 4.98 |
| v3-core-noupsert-51 | 410,965 | 82,766 | 3.17 | 4.03 |
| v3-core-upsert-51 | 418,487 | 83,173 | 3.46 | 4.31 |
| v3-react-51 | 565,333 | 109,330 | 4.20 | 5.25 |
| current-core-102 | 388,526 | 80,963 | 3.31 | 4.19 |
| current-react-102 | 541,076 | 107,694 | 4.42 | 5.75 |
| v3-core-noupsert-102 | 529,455 | 96,145 | 4.50 | 5.39 |
| v3-core-upsert-102 | 549,030 | 96,926 | 4.36 | 5.26 |
| v3-react-102 | 720,152 | 126,143 | 5.09 | 6.20 |
| current-core-201 | 487,031 | 94,427 | 5.85 | 6.68 |
| current-react-201 | 682,448 | 127,032 | 4.76 | 6.14 |
| v3-core-noupsert-201 | 759,465 | 122,116 | 6.50 | 7.45 |
| v3-core-upsert-201 | 815,637 | 123,623 | 5.19 | 6.46 |
| v3-react-201 | 1,033,883 | 158,780 | 6.65 | 7.59 |

## Derived: per-endpoint slope (Δinstantiations / 189, from 12 → 201 endpoints)

| variant | inst/endpoint | vs current-core |
|---|---|---|
| current-core | 995 | 1.0× |
| current-react | 1,428 | 1.44× |
| v3-core-noupsert | 2,323 | 2.34× |
| v3-core-upsert | 2,613 | 2.63× |
| v3-react | 3,089 | 3.11× |

Sanity check: the current-core slope of ~995 inst/endpoint independently reproduces
the architecture doc's ~1K/endpoint (measured there against built `.d.ts`), which
validates the fixture design.

## Derived: feature deltas

**React hooks layer** (react fixture minus its core counterpart):

| endpoints | current delta | v3 (reactify) delta |
|---|---|---|
| 12 | 113,580 | 128,282 |
| 201 | 195,417 | 218,246 |

Slope ≈433/endpoint (current) vs ≈476/endpoint (v3 reactify) on a ~113K vs ~122K
floor. `reactify()`'s hook surface costs roughly the same as the current
declaration-merged module — the hooks mapped type is not where v3's overhead lives.

**Upsert option** (upsert minus noupsert):

| endpoints | delta |
|---|---|
| 12 | 1,424 |
| 51 | 7,522 |
| 102 | 19,575 |
| 201 | 56,172 |

Quadratic (≈×2.6–2.9 per doubling of endpoint count) but with a small coefficient —
replicates the spike replica's finding (51,531 at 201 endpoints there). At 201
endpoints the upsert term is ~7% of the fixture total.

## Honest read

- v3's core slope is **~2.3× the current API's** (2,323 vs 995 inst/endpoint).
  At 201 endpoints that is +272K instantiations (+56%) over current-core. Wall-clock
  stays single-digit seconds for a full isolated check, and the same order of
  magnitude as current — inside Mark's "guardrail, not a gate," but real.
- Prime suspect for the overhead: `ToDefinitions<Defs, BQ, Tag, RP>` re-derives the
  full real-definition map in several positions (`CoreApiSurface`, `HooksSurface`,
  and per-cell bodies each re-instantiate `QueryDefinition`/`MutationDefinition`
  from meta records). The current API instantiates each definition exactly once, at
  the builder call. Optimization headroom exists (single conversion alias, interface
  caching, deferring `RawResultFor`), and none of it changes the public API.
- The spike replica's numbers (5,721 → 108,728 inst at 12 → 201) measured only the
  encoding's own machinery; the real-surface port multiplies that by the cost of the
  real `QueryDefinition`/hook types. Both were expected; this table is the number
  that matters.

## Addendum 2026-07-29 (M7): flavored creators cut the slope 30%

The cost investigation continued past M5/M6 with two more encodings:

1. **Flattened v3-owned cell input types** (`v3/cellTypes.ts`, replacing the reused
   `QueryDefinition`/`MutationDefinition`/`InfiniteQueryDefinition` tower on the
   *input* side): **perf-neutral** (758,373 vs 759,555 at noupsert-201, −0.2%).
   The overhead is not intersection re-normalization; interface instantiation
   caching does not help because the ~3 reverse-mapped checking passes instantiate
   with different (unresolved vs resolved) type args. Kept anyway: v3 gets its own
   input surface, decoupled from the legacy tower.
2. **De-unioning the `WithQuery | WithQueryFn` variants** is a real win. Checking
   each endpoint literal against a two-variant union forces cross-constituent
   property resolution on every pass. Replacing the union with a flavor
   discriminant on the meta record — `query()` vs `query.fn()` creators (ditto
   `mutation.fn`, `infiniteQuery.fn`), dispatched by a conditional in
   `EndpointCellBody` — keeps full `queryFn` support and drops:

| fixture @201 | M5 baseline | M7 flavored | Δ |
|---|---|---|---|
| v3-core-noupsert | 759,555 | 619,536 | −18.4% |
| v3-core-upsert | 815,637 | 671,826 | −17.6% |
| v3-react | 1,033,883 | 891,081 | −13.8% |

Full noupsert curve after M7: 312,663 / 375,986 / 458,793 / 619,536 at
12/51/102/201. **Slope: 1,624 inst/endpoint (was 2,323; current builder: 995)** —
v3 is now 1.63× current instead of 2.34×. The flavor conditional itself costs
nothing measurable (the dispatch resolves once per endpoint from the literal
flavor on the stamp).

API consequence: `queryFn`-based endpoints spread `query.fn<R, A>()` instead of
`query<R, A>()`. The codemod gains one rule: `build.query({ queryFn` maps to the
`.fn` flavor. Schema-based inference (`query({ argSchema, responseSchema })`,
recovering the current "schemas as a source of inference" path with zero explicit
generics) also landed in M7; `rawResponseSchema` participates for `query`/`mutation`
but is excluded from `.fn` flavors (no raw response exists there).

Not recoverable in the spread encoding, documented for the proposal: inferring
QueryArg from an annotated `query:` callback parameter, and inferring ResultType
from `transformResponse`'s return type. Inference flows only out of the creator
stamp (generics or schema args), never out of cell-body callbacks.

## createSlice v3 spike (2026-08-01)

Fixtures: `slice-{cur,v3}-{obj,cb}-N.ts` at 10/50/100/200 slices, generated by
`gen-scale-slice.mts`. Per slice: payload reducer, no-payload reducer, and a
prepared reducer (object form) or `create.asyncThunk` with pending/fulfilled
handlers (callback form), plus one slice selector. 2.x callback baseline uses
`buildCreateSlice` + the `asyncThunkCreator` symbol; v3 uses the per-call
`creators: (ctx) => ({ asyncThunk: asyncThunkCreator(ctx) })` option.

| fixture | instantiations | types | check (s) |
|---|---|---|---|
| slice-cur-obj-10 / 200 | 68,280 / 195,390 | 24,268 / 51,628 | 1.00 / 2.00 |
| slice-v3-obj-10 / 200 | 67,172 / 119,042 | 24,779 / 42,259 | 0.99 / 1.59 |
| slice-cur-cb-10 / 200 | 69,325 / 214,485 | 24,928 / 64,638 | 1.02 / 2.23 |
| slice-v3-cb-10 / 200 | 37,814 / 178,414 | 13,196 / 56,136 | 0.60 / 1.69 |

Marginal instantiations per slice (identical across every interval — all four
curves are exactly linear):

| form | 2.x | v3 | delta |
|---|---|---|---|
| object | 669 | **273** | −59% |
| callback (incl. asyncThunk) | 764 | **740** | −3% |

The v3 object form is 2.4× cheaper per slice, mostly from the simpler
exposure-driven `actions`/`caseReducers` mapped types replacing 2.x's
`CaseReducerActions`/`ActionCreatorForCaseReducer` machinery. The v3 callback
form matches the 2.x slope (slightly better) while dropping the
`buildCreateSlice` ritual — the per-call `creators` callback costs nothing
measurable at scale. No superlinear behavior anywhere.

Follow-up after adding selector injection (`injectInto`, `InjectedSlice`, v3
`combineSlices` with the getInitialState-preferring state proxy): v3 slopes
moved from 273 to 276 (object) and 740 to 743 (callback) instantiations per
slice — the injection typing costs 3 inst/slice and stays exactly linear.
