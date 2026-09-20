import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Introduction',
      collapsed: false,
      items: [
        'introduction/getting-started',
        {
          type: 'link',
          label: 'Why Redux Toolkit is How to Use Redux Today',
          href: 'https://redux.js.org/introduction/why-rtk-is-redux-today',
        },
      ],
    },

    {
      type: 'category',
      label: 'Tutorials',
      collapsed: false,
      items: [
        {
          type: 'link',
          label: 'Tutorials Index',
          href: 'https://redux.js.org/tutorials/index',
        },
        {
          type: 'link',
          label: 'Quick Start',
          href: 'https://redux.js.org/tutorials/quick-start',
        },
        'tutorials/rtk-query',
      ],
    },
    {
      type: 'category',
      label: 'Using Redux Toolkit',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Migrations',
          items: [
            {
              type: 'link',
              label: 'Migrating to Modern Redux',
              href: 'https://redux.js.org/usage/migrating-to-modern-redux',
            },
            {
              type: 'link',
              label: 'Migrating to RTK 2.0 and Redux 5.0',
              href: 'https://redux.js.org/usage/migrations/migrating-rtk-2',
            },
          ],
        },
        'usage/usage-guide',
        'usage/usage-with-typescript',
        'usage/immer-reducers',
        {
          type: 'link',
          label: 'Setup with Next.js',
          href: 'https://redux.js.org/usage/nextjs',
        },
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Store Setup',
          collapsed: false,
          items: [
            'api/configureStore',
            'api/getDefaultMiddleware',
            'api/immutabilityMiddleware',
            'api/serializabilityMiddleware',
            'api/actionCreatorMiddleware',
            'api/createListenerMiddleware',
            'api/createDynamicMiddleware',
            'api/getDefaultEnhancers',
            'api/autoBatchEnhancer',
          ],
        },
        {
          type: 'category',
          label: 'Reducers and Actions',
          collapsed: false,
          items: [
            'api/createReducer',
            'api/createAction',
            'api/createSlice',
            'api/createAsyncThunk',
            'api/createEntityAdapter',
            'api/combineSlices',
          ],
        },
        {
          type: 'category',
          label: 'Other',
          collapsed: false,
          items: [
            'api/createSelector',
            'api/matching-utilities',
            'api/other-exports',
            'api/codemods',
            { type: 'link', label: 'Error Messages', href: '/errors' },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'RTK Query',
      collapsed: false,
      items: [
        'rtk-query/overview',
        'rtk-query/comparison',
        'rtk-query/usage/examples',
        'rtk-query/usage-with-typescript',
        {
          type: 'category',
          label: 'Using RTK Query',
          collapsed: true,
          items: [
            {
              type: 'category',
              label: 'Standard Usage',
              collapsed: false,
              items: [
                'rtk-query/usage/queries',
                'rtk-query/usage/infinite-queries',
                'rtk-query/usage/mutations',
                'rtk-query/usage/cache-behavior',
                'rtk-query/usage/automated-refetching',
              ],
            },
            {
              type: 'category',
              label: 'Common Use Cases',
              collapsed: false,
              items: [
                'rtk-query/usage/conditional-fetching',
                'rtk-query/usage/manual-cache-updates',
                'rtk-query/usage/error-handling',
                'rtk-query/usage/pagination',
                'rtk-query/usage/prefetching',
                'rtk-query/usage/polling',
                'rtk-query/usage/customizing-queries',
                'rtk-query/usage/migrating-to-rtk-query',
              ],
            },
            {
              type: 'category',
              label: 'Advanced Use Cases',
              collapsed: false,
              items: [
                'rtk-query/usage/streaming-updates',
                'rtk-query/usage/code-splitting',
                'rtk-query/usage/code-generation',
                'rtk-query/usage/server-side-rendering',
                'rtk-query/usage/persistence-and-rehydration',
                'rtk-query/usage/usage-without-react-hooks',
                'rtk-query/usage/customizing-create-api',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'API Reference',
          collapsed: true,
          items: [
            'rtk-query/api/createApi',
            'rtk-query/api/fetchBaseQuery',
            'rtk-query/api/ApiProvider',
            'rtk-query/api/setupListeners',
            {
              type: 'category',
              label: 'Generated API Slices',
              collapsed: false,
              items: [
                'rtk-query/api/created-api/overview',
                'rtk-query/api/created-api/redux-integration',
                'rtk-query/api/created-api/endpoints',
                'rtk-query/api/created-api/hooks',
                'rtk-query/api/created-api/code-splitting',
                'rtk-query/api/created-api/api-slice-utils',
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default sidebars
