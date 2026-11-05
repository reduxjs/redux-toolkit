# enhanceEndpoint

Rewrites calls to RTK Query's `api.enhanceEndpoints()` to use chained `api.addTagTypes()` and `api.enhanceEndpoint()` calls instead, in preparation for removal of `enhanceEndpoints` in RTK 3.0.

Should work with both JS and TS files.

`enhanceEndpoints` ignored the return value of endpoint callbacks, but `enhanceEndpoint` merges a returned object into the definition. Arrow function callbacks without a block body, like `(definition) => (definition.providesTags = ['Post'])`, are rewritten with a block body so their return value is still ignored. Callbacks that return an object literal are kept as is, so that object now gets merged into the definition.

Calls are left unchanged when the options can't be converted safely: `endpoints` is not an object literal, the options or `endpoints` object contain spreads, or the options are passed as a variable.

## Usage

```bash
npx @reduxjs/rtk-codemods enhanceEndpoint path/of/files/ or/some**/*glob.js

# or

yarn global add @reduxjs/rtk-codemods
rtk-codemods enhanceEndpoint path/of/files/ or/some**/*glob.js
```

## Local Usage

```
node ./bin/cli.mjs enhanceEndpoint path/of/files/ or/some**/*glob.js
```

## Input / Output

**Input** (<small>[basic-ts.input.ts](__testfixtures__/basic-ts.input.ts)</small>):

```ts
import { api } from './api'

export const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['Post', 'User'] as const,
  endpoints: {
    getPosts: {
      providesTags: (result: Post[] | undefined) =>
        result ? result.map(({ id }) => ({ type: 'Post' as const, id })) : []
    },
    getPost(definition: QueryDefinition) {
      definition.keepUnusedDataFor = 5
    }
  }
})

export const withTagList = api.enhanceEndpoints({
  addTagTypes: ['Post', 'User']
})
```

**Output** (<small>[basic-ts.output.ts](__testfixtures__/basic-ts.output.ts)</small>):

```ts
import { api } from './api'

export const enhancedApi = api.addTagTypes('Post', 'User').enhanceEndpoint('getPosts', {
  providesTags: (result: Post[] | undefined) =>
    result ? result.map(({ id }) => ({ type: 'Post' as const, id })) : []
}).enhanceEndpoint('getPost', (definition: QueryDefinition) => {
  definition.keepUnusedDataFor = 5
})

export const withTagList = api.addTagTypes('Post', 'User')
```

See [basic.input.js](__testfixtures__/basic.input.js) and [basic.output.js](__testfixtures__/basic.output.js) for more cases, including the ones that are left unchanged.
