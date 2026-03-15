# Redux Toolkit - Skill Spec

Redux Toolkit is the current recommended way to write Redux logic, and this monorepo also contains RTK Query plus companion codegen and codemod packages. The skill surface is driven less by isolated APIs than by developer moments: setting up modern Redux, deciding what belongs in the store, handling side effects, adopting RTK Query, migrating legacy patterns, and debugging subtle state-flow issues.

## Domains

| Domain | Description | Skills |
| ------ | ----------- | ------ |
| Build Modern Redux Apps | Getting a React plus Redux Toolkit app wired correctly and understanding the action-to-state-to-UI loop. | modern-redux, redux-dataflow |
| Model Redux State | Deciding what belongs in Redux and shaping slice state so updates and selectors stay maintainable. | design-state-ownership, build-slices-and-selectors |
| Orchestrate Side Effects | Choosing and implementing the right async or reactive mechanism outside reducers. | handle-side-effects |
| Manage Server Data | Fetching, caching, invalidating, and generating server-state integrations with RTK Query. | adopt-rtk-query, generate-rtk-query-from-openapi |
| Evolve And Diagnose Redux Apps | Migrating legacy code forward and tracing bugs back to state flow, configuration, or cache behavior. | migrate-to-modern-redux, debug-redux-toolkit-apps |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| ----- | ---- | ------ | -------------- | ------------- |
| modern-redux | lifecycle | build-modern-redux-apps | configureStore, Provider, hooks-first React-Redux usage, typed hooks, SPA vs SSR-heavy store lifetime | 4 |
| redux-dataflow | core | build-modern-redux-apps | actions, reducers, selectors, state machines, event-style actions, reducer-owned transitions | 5 |
| design-state-ownership | core | model-redux-state | local vs global state, authority boundaries, slice sizing, root keys, reducer ownership | 5 |
| build-slices-and-selectors | core | model-redux-state | createSlice, slice selectors, create.asyncThunk, lazy injection APIs, Immer, createEntityAdapter | 4 |
| handle-side-effects | core | orchestrate-side-effects | RTK Query vs thunk vs listener boundaries, createAsyncThunk, createListenerMiddleware | 3 |
| adopt-rtk-query | lifecycle | manage-server-data | createApi, fetchBaseQuery, document cache tradeoffs, invalidation, hooks, persistence caveats | 5 |
| generate-rtk-query-from-openapi | composition | manage-server-data | empty API pattern, codegen config, endpointOverrides, generated hooks, tags | 3 |
| migrate-to-modern-redux | lifecycle | evolve-and-diagnose-redux-apps | configureStore migration, createSlice rewrites, hooks migration, RTK 2 changes, codemods | 3 |
| debug-redux-toolkit-apps | lifecycle | evolve-and-diagnose-redux-apps | DevTools, strict-mode duplication, subscription granularity, selector stability, reducerPath conflicts | 4 |

## Failure Mode Inventory

### modern-redux (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Importing the store directly into React UI components | HIGH | tutorials/essentials part 3; style guide; maintainer interview | - |
| 2 | Defaulting to `connect()` for new React code | HIGH | migrating-to-modern-redux; style guide; maintainer interview | - |
| 3 | Recreating the store during render in SSR-heavy React frameworks | HIGH | nextjs guide; maintainer interview | - |
| 4 | Keeping manual `createStore` boilerplate as the default | HIGH | migrating-to-modern-redux; style guide | - |

### redux-dataflow (5 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Mutating selected state outside reducers | CRITICAL | style guide; immer docs | - |
| 2 | Using setter-style actions instead of event-style actions | HIGH | style guide; maintainer interview | - |
| 3 | Combining store state with new external data before dispatch | HIGH | style guide; maintainer interview | build-slices-and-selectors |
| 4 | Ignoring current state when reducing async actions | HIGH | style guide; essentials part 5 | - |
| 5 | Storing derived values instead of deriving them | MEDIUM | style guide | - |

### design-state-ownership (5 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Putting ordinary form editing state in Redux | MEDIUM | style guide | - |
| 2 | Synchronizing router or URL state into Redux | HIGH | maintainer interview | - |
| 3 | Naming state after components instead of data | HIGH | style guide | - |
| 4 | Letting slice boundaries fossilize as the app evolves | MEDIUM | maintainer interview | - |
| 5 | Blindly spreading payloads into state | HIGH | style guide | - |

### build-slices-and-selectors (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Using mutating update logic outside Immer reducers | CRITICAL | createSlice docs; immer docs | - |
| 2 | Writing hand-written switch reducers as the default | HIGH | migrating-to-modern-redux; style guide; maintainer interview | - |
| 3 | Writing RTK 1.x object syntax for `extraReducers` | HIGH | migrating-rtk-2; createSlice source | - |
| 4 | Relying on `entity.id` when the real key is elsewhere | HIGH | createEntityAdapter docs | - |

### handle-side-effects (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Running side effects inside reducers | CRITICAL | style guide; createAsyncThunk docs | - |
| 2 | Using thunks to watch future state changes | HIGH | style guide; listener middleware docs | - |
| 3 | Appending listener middleware after the default checks | HIGH | createListenerMiddleware docs | - |

### adopt-rtk-query (5 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Creating many API slices for one backend | CRITICAL | createApi docs; dev middleware source | debug-redux-toolkit-apps |
| 2 | Forgetting to add api.reducer and api.middleware to the store | HIGH | RTK Query quick start; core module source | - |
| 3 | Persisting browser API cache as a default optimization | MEDIUM | persistence-and-rehydration docs | - |
| 4 | Manually patching cache from arbitrary component code | HIGH | manual-cache-updates docs; essentials part 8 | - |
| 5 | Expecting invalidation to refetch unsubscribed queries | HIGH | automated-refetching docs; maintainer interview | - |

### generate-rtk-query-from-openapi (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Assuming auto-generated tags are granular enough | HIGH | code-generation docs | - |
| 2 | Generating a brand-new API slice instead of extending an empty one | HIGH | code-generation docs | - |
| 3 | Trusting generated query and mutation shapes without overrides | MEDIUM | code-generation docs | - |

### migrate-to-modern-redux (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Attempting a big-bang rewrite of the whole app | HIGH | migrating-to-modern-redux docs | - |
| 2 | Carrying removed RTK 2 configuration forms forward | CRITICAL | migrating-rtk-2 docs; configureStore source | - |
| 3 | Preserving hand-written fetch lifecycle state by default | HIGH | migrating-to-modern-redux docs; style guide; maintainer interview | adopt-rtk-query, handle-side-effects |

### debug-redux-toolkit-apps (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| - | ------- | -------- | ------ | ------------ |
| 1 | Dispatching fetch thunks from effects without a thunk-level guard | HIGH | essentials part 5 | handle-side-effects |
| 2 | Ignoring serializable-state warnings as harmless noise | HIGH | style guide; usage guide | - |
| 3 | Selecting broad slice state in parents and threading it through props | HIGH | style guide; maintainer interview | - |
| 4 | Returning unstable objects from query selection logic | MEDIUM | essentials part 8; style guide | - |

## Tensions

| Tension | Skills | Agent implication |
| ------- | ------ | ----------------- |
| Local simplicity vs global observability | modern-redux ↔ design-state-ownership | Agents over-globalize transient UI state when they optimize only for Redux consistency. |
| Normalized slice ownership vs document-cache convenience | build-slices-and-selectors ↔ adopt-rtk-query | Agents duplicate server data or force RTK Query into a normalized-cache mental model unnecessarily. |
| Imperative clarity vs reactive orchestration | handle-side-effects ↔ redux-dataflow | Agents overuse thunks for workflows that should react to future actions or state changes. |
| Single API slice performance vs file-level modularity | adopt-rtk-query ↔ generate-rtk-query-from-openapi | Agents create multiple createApi roots for organization and lose invalidation and reducerPath safety. |

## Cross-References

| From | To | Reason |
| ---- | -- | ------ |
| modern-redux | redux-dataflow | Store setup decisions make more sense when the action, reducer, selector, and render loop is explicit. |
| design-state-ownership | build-slices-and-selectors | State shape decisions directly determine how slices, entity adapters, and selectors should be authored. |
| build-slices-and-selectors | handle-side-effects | extraReducers, async thunk actions, and listener-triggered updates meet at slice boundaries. |
| adopt-rtk-query | generate-rtk-query-from-openapi | Generated endpoints still need a coherent RTK Query architecture. |
| migrate-to-modern-redux | modern-redux | Migration advice depends on a clear target architecture. |
| debug-redux-toolkit-apps | redux-dataflow | Many bugs become obvious once the intended Redux data flow is explicit. |

## Subsystems & Reference Candidates

| Skill | Subsystems | Reference candidates |
| ----- | ---------- | -------------------- |
| modern-redux | - | store lifetime and framework-specific setup |
| redux-dataflow | - | reducer-owned state transitions |
| design-state-ownership | - | authority boundaries and slice sizing |
| build-slices-and-selectors | - | slice reducer patterns, selectors, and lazy injection |
| handle-side-effects | - | listener middleware workflow helpers |
| adopt-rtk-query | - | endpoint lifecycle and cache control options |
| generate-rtk-query-from-openapi | - | codegen config and endpoint override options |
| migrate-to-modern-redux | - | - |
| debug-redux-toolkit-apps | - | - |

## Remaining Gaps

None after the Phase 4 maintainer interview and repo/issue follow-up.

## Recommended Skill File Structure

- Core skills: redux-dataflow, design-state-ownership, build-slices-and-selectors, handle-side-effects
- Framework skills: none inside this repo; modern-redux composes with react-redux externally
- Lifecycle skills: modern-redux, adopt-rtk-query, migrate-to-modern-redux, debug-redux-toolkit-apps
- Composition skills: generate-rtk-query-from-openapi
- Reference files: build-slices-and-selectors, handle-side-effects, adopt-rtk-query, generate-rtk-query-from-openapi

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| ------- | ------------------ | ------------------------- |
| react-redux | Provider, hooks, typed hooks, modern Redux app structure | yes - modern-redux |
| redux-persist | serializability exceptions, RTK Query rehydration, browser staleness caveats | no - mention inside adopt-rtk-query |
| OpenAPI | endpoint generation, tags, overrides, output structure | yes - generate-rtk-query-from-openapi |
| @reduxjs/rtk-codemods | RTK 2 migration rewrites | no - mention inside migrate-to-modern-redux |
