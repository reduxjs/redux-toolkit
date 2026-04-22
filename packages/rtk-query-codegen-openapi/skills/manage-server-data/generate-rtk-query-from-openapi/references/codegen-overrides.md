# Codegen Overrides

## Common override targets

| Need | Override |
| --- | --- |
| Query should really be a mutation | `type: 'mutation'` |
| Header or optional parameters should be omitted | `parameterFilter` |
| Generated tags are too coarse | `providesTags` / `invalidatesTags` |

## Example: split one schema into multiple outputs

```ts
import type { ConfigFile } from '@rtk-query/codegen-openapi'

const config: ConfigFile = {
  schemaFile: './openapi.json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFiles: {
    './src/store/userApi.ts': {
      exportName: 'userApi',
      filterEndpoints: [/user/i],
      hooks: true,
    },
    './src/store/orderApi.ts': {
      exportName: 'orderApi',
      filterEndpoints: [/order/i],
      hooks: true,
    },
  },
}

export default config
```

## Review checklist

- Does every generated endpoint belong in the shared API root?
- Did any query or mutation type need correction?
- Are generated tags specific enough for real invalidation needs?
- Did the schema force parameters into the signature that the app should hide?
