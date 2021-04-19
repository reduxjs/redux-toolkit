---
id: customizing-create-api
title: Customizing createApi
sidebar_label: Customizing createApi
hide_title: true
---

# Customizing `createApi`

Currently, RTK Query includes two variants of `createApi`:

- `createBaseApi` which contains only the basic redux logic (the core module)
- `createApi` which contains both the core and react-hooks modules

You can create your own versions of `createApi` by either specifying non-default options for the modules or by adding your own modules.

## Customizing the React-Redux Hooks

If you want the hooks to use different versions of `useSelector` or `useDispatch`, for example if you are using a custom context, you can pass these in at module creation:

```ts
import * as React from 'react';
import { createDispatchHook, ReactReduxContextValue } from 'react-redux';
import { buildCreateApi, coreModule, reactHooksModule } from '@rtk-incubator/rtk-query';

const MyContext = React.createContext<ReactReduxContextValue>(null as any);
const customCreateApi = buildCreateApi(coreModule(), reactHooksModule({ useDispatch: createDispatchHook(MyContext) }));
```

## Creating your own module

If you want to create your own module, you should review [the react-hooks module](https://github.com/rtk-incubator/rtk-query/blob/main/src/react-hooks/module.ts) to see what an implementation would look like.

Here is a very stripped down version:

```ts
import { CoreModule } from '@internal/core/module';
import { BaseQueryFn, EndpointDefinitions, Api, Module, buildCreateApi, coreModule } from '@rtk-incubator/rtk-query';

export const customModuleName = Symbol();
export type CustomModule = typeof customModuleName;

declare module '@rtk-incubator/rtk-query' {
  export interface ApiModules<
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    TagTypes extends string
  > {
    [customModuleName]: {
      endpoints: {
        [K in keyof Definitions]: {
          myEndpointProperty: string;
        };
      };
    };
  }
}

export const myModule = (): Module<CustomModule> => ({
  name: customModuleName,
  init(api, options, context) {
    // initialize stuff here if you need to

    return {
      injectEndpoint(endpoint, definition) {
        const anyApi = (api as any) as Api<any, Record<string, any>, string, string, CustomModule | CoreModule>;
        anyApi.endpoints[endpoint].myEndpointProperty = 'test';
      },
    };
  },
});

export const myCreateApi = buildCreateApi(coreModule(), myModule());
```
