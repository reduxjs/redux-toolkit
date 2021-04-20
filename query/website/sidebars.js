module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Introduction',
      collapsed: true,
      items: ['introduction/getting-started', 'introduction/comparison', 'introduction/video-overview'],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: true,
      items: [
        'concepts/queries',
        'concepts/mutations',
        'concepts/error-handling',
        'concepts/conditional-fetching',
        'concepts/pagination',
        'concepts/polling',
        'concepts/prefetching',
        'concepts/optimistic-updates',
        'concepts/code-splitting',
        'concepts/code-generation',
        'concepts/customizing-create-api',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Exports',
          collapsed: false,
          items: ['api/createApi', 'api/fetchBaseQuery', 'api/ApiProvider', 'api/setupListeners'],
        },
        {
          type: 'category',
          label: 'Generated API Slices',
          collapsed: false,
          items: [
            'api/created-api/overview',
            'api/created-api/redux-integration',
            'api/created-api/endpoints',
            'api/created-api/code-splitting',
            'api/created-api/cache-management',
            'api/created-api/hooks',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: [
        'examples/examples-overview',
        'examples/authentication',
        'examples/react-hooks',
        'examples/react-class-components',
        'examples/react-with-graphql',
        'examples/react-optimistic-updates',
        'examples/svelte',
      ],
    },
  ],
};
