// Hand-written probe: cost of chained enhanceEndpoint / addTagTypes calls
// on top of the 201-endpoint fixture. Checks the #3214-shaped worry that
// each chained call re-maps the whole Defs record.
// prettier-ignore
/* eslint-disable */
import { api } from './v3-core-noupsert-201'

const enhanced = api
  .addTagTypes('TagF')
  .enhanceEndpoint('getThing0', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing1', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing2', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing3', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing4', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing5', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing6', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing7', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing8', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing9', { providesTags: ['TagF'] })
  .enhanceEndpoint('getThing10List', {
    transformResponse: (raw: { data: unknown[] }) => raw.data.length,
  })
  .enhanceEndpoint('getThing11List', {
    transformResponse: (raw: { data: unknown[] }) => raw.data.length,
  })
  .enhanceEndpoint('getThing12List', {
    transformResponse: (raw: { data: unknown[] }) => raw.data.length,
  })
  .enhanceEndpoint('getThing13List', {
    transformResponse: (raw: { data: unknown[] }) => raw.data.length,
  })
  .enhanceEndpoint('getThing14List', {
    transformResponse: (raw: { data: unknown[] }) => raw.data.length,
  })
  .enhanceEndpoint('updateThing0', { invalidatesTags: ['TagF'] })
  .enhanceEndpoint('updateThing1', { invalidatesTags: ['TagF'] })
  .enhanceEndpoint('updateThing2', { invalidatesTags: ['TagF'] })
  .enhanceEndpoint('updateThing3', { invalidatesTags: ['TagF'] })
  .enhanceEndpoint('updateThing4', { invalidatesTags: ['TagF'] })

// touch the result so the type is actually computed
const sel = enhanced.endpoints.getThing10List.select
const ini = enhanced.endpoints.getThing0.initiate

// Deliberately NOT exported: exporting forces declaration-naming checks
// (TS4023) against the fixture's non-exported domain interfaces under
// declaration-aware tsconfigs (e.g. vitest --typecheck).
void enhanced
void sel
void ini
