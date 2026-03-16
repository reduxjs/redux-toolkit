---
name: manage-server-data/generate-rtk-query-from-openapi
description: >
  Use this when generating RTK Query endpoints from OpenAPI schemas with
  @rtk-query/codegen-openapi. Covers the empty API pattern, filterEndpoints,
  endpointOverrides, generated tags, and reviewing generated output before it
  becomes part of the app.
type: composition
library: "@rtk-query/codegen-openapi"
library_version: "2.2.0"
requires:
  - manage-server-data/adopt-rtk-query
sources:
  - "reduxjs/redux-toolkit:docs/rtk-query/usage/code-generation.mdx"
  - "reduxjs/redux-toolkit:packages/rtk-query-codegen-openapi/src/types.ts"
  - "reduxjs/redux-toolkit:packages/rtk-query-codegen-openapi/src/generate.ts"
  - "reduxjs/redux-toolkit:packages/rtk-query-codegen-openapi/README.md"
---

# Generate RTK Query From OpenAPI

## Setup

```ts
// file: src/store/emptyApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const emptySplitApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: () => ({}),
})

// file: openapi-config.ts
import type { ConfigFile } from '@rtk-query/codegen-openapi'

const config: ConfigFile = {
  schemaFile: 'https://petstore3.swagger.io/api/v3/openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/petApi.ts',
  exportName: 'petApi',
  hooks: true,
}

export default config
```

Run:

```bash
npx @rtk-query/codegen-openapi openapi-config.ts
```

## Core Patterns

### Generate into an empty shared API

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const emptySplitApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: () => ({}),
})
```

Codegen works best when it extends a single RTK Query architecture instead of creating standalone API roots.

### Filter endpoints when the schema is too broad

```ts
import type { ConfigFile } from '@rtk-query/codegen-openapi'

const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/userApi.ts',
  exportName: 'userApi',
  hooks: true,
  filterEndpoints: ['loginUser', /User/],
}

export default config
```

Start with a narrow slice of the schema if the full surface area is too noisy or the package boundaries differ from the OpenAPI file.

### Use `endpointOverrides` to fix generation results

```ts
import type { ConfigFile } from '@rtk-query/codegen-openapi'

const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/petApi.ts',
  exportName: 'petApi',
  hooks: true,
  tag: true,
  endpointOverrides: [
    {
      pattern: 'loginUser',
      type: 'mutation',
    },
    {
      pattern: /.*/,
      parameterFilter: (_name, parameter) => parameter.in !== 'header',
    },
    {
      pattern: 'getPetById',
      providesTags: ['SinglePet'],
    },
  ],
}

export default config
```

Review generated endpoints and override type, parameter, or tag behavior instead of hand-editing the emitted file.

## Common Mistakes

### HIGH Assuming generated tags are already specific enough

Wrong:

```ts
const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/petApi.ts',
  exportName: 'petApi',
  tag: true,
}
```

Correct:

```ts
const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/petApi.ts',
  exportName: 'petApi',
  tag: true,
  endpointOverrides: [
    {
      pattern: 'getPetById',
      providesTags: ['SinglePet'],
    },
  ],
}
```

Generated tags are string-only by default, so they can invalidate more cache than intended.

Source: reduxjs/redux-toolkit:docs/rtk-query/usage/code-generation.mdx

### HIGH Generating a brand-new API root instead of extending an empty one

Wrong:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

type Pet = { id: string; name: string }

export const petApi = createApi({
  reducerPath: 'petApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: (build) => ({
    getPetById: build.query<Pet, string>({
      query: (id) => `pets/${id}`,
    }),
  }),
})
```

Correct:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const emptySplitApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: () => ({}),
})
```

Generated code should plug into one RTK Query architecture so invalidation and store wiring stay coherent.

Source: reduxjs/redux-toolkit:docs/rtk-query/usage/code-generation.mdx

### MEDIUM Trusting generated shapes without overrides or review

Wrong:

```ts
const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/petApi.ts',
  exportName: 'petApi',
}
```

Correct:

```ts
const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/petApi.ts',
  exportName: 'petApi',
  endpointOverrides: [
    {
      pattern: 'loginUser',
      type: 'mutation',
    },
  ],
}
```

Real schemas often need type, parameter, or tag correction; treat generated output as reviewed source, not gospel.

Source: reduxjs/redux-toolkit:docs/rtk-query/usage/code-generation.mdx

## References

- [Codegen override patterns and review checklist](references/codegen-overrides.md)
