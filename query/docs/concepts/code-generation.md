---
id: code-generation
title: Code Generation
sidebar_label: Code Generation
hide_title: true
---

# Code Generation

## OpenAPI

Right now, we have a first version of a code generator from OpenApi schemas over at [rtk-incubator/rtk-query-codegen](https://github.com/rtk-incubator/rtk-query-codegen).

You can create an api by running:

```bash
curl -o petstore.json https://petstore3.swagger.io/api/v3/openapi.json
npx @rtk-incubator/rtk-query-codegen-openapi petstore.json > petstore-api.generated.ts
```

We recommend placing these generated types in one file that you do not modify (so you can constantly re-generate it when your API definition changes) and creating a second file to enhance it with additional info:

```ts title="petstore-api.ts"
import { api as generatedApi } from './petstore-api.generated';

export const api = generatedApi.enhanceEndpoints({
  addTagTypes: ['Pet'],
  endpoints: {
    // basic notation: just specify properties to be overridden
    getPetById: {
      providesTags: (result, error, arg) => [{ type: 'Pet', id: arg.petId }],
    },
    findPetsByStatus: {
      providesTags: (result) =>
        // is result available?
        result
          ? // successful query
            [{ type: 'Pet', id: 'LIST' }, ...result.map((pet) => ({ type: 'Pet' as const, id: pet.id }))]
          : // an error occurred, but we still want to refetch this query when `{ type: 'Pet', id: 'LIST' }` is invalidated
            [{ type: 'Pet', id: 'LIST' }],
    },
    // alternate notation: callback that gets passed in `endpoint` - you can freely modify the object here
    addPet: (endpoint) => {
      endpoint.invalidatesTags = (result) => [{ type: 'Pet', id: result.id }];
    },
    updatePet: {
      invalidatesTags: (result, error, arg) => [{ type: 'Pet', id: arg.petId }],
    },
    deletePet: {
      invalidatesTags: (result, error, arg) => [{ type: 'Pet', id: arg.petId }],
    },
  },
});

export const {
  useGetPetByIdQuery,
  useFindPetsByStatusQuery,
  useAddPetMutation,
  useUpdatePetMutation,
  useDeletePetMutation,
} = api;
```
