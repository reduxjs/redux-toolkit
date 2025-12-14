/**
 * Category configuration for issue categorization
 */

export interface CategoryConfig {
  name: string
  displayName: string
  labels: string[]
  keywords: string[]
  patterns: RegExp[]
  weight: number
  subcategories?: SubcategoryConfig[]
}

export interface SubcategoryConfig {
  name: string
  displayName: string
  keywords: string[]
  patterns: RegExp[]
}

/**
 * Primary category configurations
 */
export const CATEGORIES: CategoryConfig[] = [
  {
    name: 'rtk-query',
    displayName: 'RTK Query',
    labels: ['RTK Query', 'rtk-query'],
    keywords: [
      'rtk query',
      'rtkquery',
      'createapi',
      'endpoints',
      'usemutation',
      'usequery',
      'uselazyquery',
      'api slice',
      'cache',
      'invalidate',
      'refetch',
      'resetapistate',
      'optimistic update',
      'retry',
      'abortcontroller',
      'refetchonreconnect',
      'keepunuseddatafor',
      'serializequeryargs',
    ],
    patterns: [
      /rtk[-\s]?query/i,
      /createApi/i,
      /use\w+Query/i,
      /use\w+Mutation/i,
    ],
    weight: 2.0,
    subcategories: [
      {
        name: 'polling',
        displayName: 'Polling',
        keywords: ['polling', 'pollinginterval', 'refetchonmount'],
        patterns: [/polling/i, /refetch/i],
      },
      {
        name: 'cache',
        displayName: 'Cache Management',
        keywords: [
          'cache',
          'invalidate',
          'invalidatetags',
          'providestags',
          'cache invalidation',
          'resetapistate',
          'keepunuseddatafor',
        ],
        patterns: [/cache/i, /invalidate/i, /tag/i],
      },
      {
        name: 'hooks',
        displayName: 'Query/Mutation Hooks',
        keywords: ['usequery', 'usemutation', 'uselazyquery', 'hook'],
        patterns: [/use\w+Query/i, /use\w+Mutation/i],
      },
      {
        name: 'typescript-types',
        displayName: 'TypeScript Types',
        keywords: ['types', 'typing', 'inference', 'generic'],
        patterns: [/type/i, /typing/i, /inference/i],
      },
      {
        name: 'ssr',
        displayName: 'Server-Side Rendering',
        keywords: ['ssr', 'server side', 'nextjs', 'next.js', 'hydration'],
        patterns: [/ssr/i, /server[-\s]?side/i, /next\.?js/i],
      },
      {
        name: 'error-handling',
        displayName: 'Error Handling',
        keywords: ['error', 'error handling', 'retry', 'onerror'],
        patterns: [/error/i, /retry/i],
      },
      {
        name: 'optimistic-updates',
        displayName: 'Optimistic Updates',
        keywords: [
          'optimistic',
          'optimistic update',
          'pessimistic',
          'onquerystarted',
          'updatequerydata',
        ],
        patterns: [/optimistic/i, /pessimistic/i, /onQueryStarted/i],
      },
      {
        name: 'mutations',
        displayName: 'Mutations',
        keywords: ['mutation', 'usemutation', 'post', 'put', 'delete', 'patch'],
        patterns: [/mutation/i, /useMutation/i],
      },
      {
        name: 'queries',
        displayName: 'Queries',
        keywords: ['query', 'usequery', 'uselazyquery', 'get', 'fetch'],
        patterns: [/\bquery\b/i, /useQuery/i, /useLazyQuery/i],
      },
    ],
  },
  {
    name: 'codegen',
    displayName: 'RTK Query Codegen',
    labels: ['RTKQ-Codegen'],
    keywords: [
      'codegen',
      'code generation',
      'openapi',
      'swagger',
      '@rtk-query/codegen-openapi',
      'rtk-query-codegen',
      'generate',
      'generated',
      'api generation',
    ],
    patterns: [
      /codegen/i,
      /code[-\s]?generation/i,
      /openapi/i,
      /swagger/i,
      /@rtk-query\/codegen/i,
      /RTKQ-Codegen/i,
    ],
    weight: 2.0,
    subcategories: [
      {
        name: 'type-generation',
        displayName: 'Type Generation',
        keywords: [
          'type',
          'types',
          'typescript',
          'nullable',
          'readonly',
          'writeonly',
          'discriminator',
          'anyOf',
          'oneOf',
          'allOf',
          'circular',
          'inference',
          'discriminated union',
        ],
        patterns: [
          /\btype/i,
          /nullable/i,
          /discriminator/i,
          /anyOf|oneOf|allOf/i,
          /circular/i,
        ],
      },
      {
        name: 'parameter-handling',
        displayName: 'Parameter Handling',
        keywords: [
          'parameter',
          'parameters',
          'queryArg',
          'optional',
          'required',
          'collectionFormat',
          'path parameter',
          'query parameter',
          'request body',
        ],
        patterns: [
          /parameter/i,
          /queryArg/i,
          /collectionFormat/i,
          /request\s+body/i,
        ],
      },
      {
        name: 'configuration',
        displayName: 'Configuration',
        keywords: [
          'config',
          'configuration',
          'outputFiles',
          'filterEndpoints',
          'basePath',
          'apiFile',
          'exportName',
          'authorization',
          'prefix',
          'output files',
        ],
        patterns: [
          /config/i,
          /outputFiles/i,
          /filterEndpoints/i,
          /basePath/i,
          /apiFile/i,
        ],
      },
      {
        name: 'openapi-features',
        displayName: 'OpenAPI Features',
        keywords: [
          'openapi',
          'swagger',
          'spec',
          'specification',
          'content-type',
          'response code',
          '2XX',
          'pattern',
          'status code',
        ],
        patterns: [
          /openapi/i,
          /swagger/i,
          /content[-\s]?type/i,
          /\b2XX\b/i,
          /status\s+code/i,
        ],
      },
      {
        name: 'hook-generation',
        displayName: 'Hook Generation',
        keywords: [
          'hook',
          'hooks',
          'useQueryState',
          'useQuery',
          'useMutation',
          'useLazyQuery',
          'generated hooks',
        ],
        patterns: [
          /hook/i,
          /useQueryState/i,
          /use\w+Query/i,
          /use\w+Mutation/i,
        ],
      },
      {
        name: 'dependencies',
        displayName: 'Dependencies',
        keywords: [
          'dependency',
          'dependencies',
          'oazapfts',
          'typescript',
          'ts 5',
          'version',
          'deepmerge',
        ],
        patterns: [
          /dependency/i,
          /oazapfts/i,
          /typescript\s+\d/i,
          /deepmerge/i,
        ],
      },
    ],
  },
  {
    name: 'core',
    displayName: 'Core Redux Toolkit',
    labels: ['core'],
    keywords: [
      'createslice',
      'configurestore',
      'createasyncthunk',
      'middleware',
      'reducer',
      'action',
      'dispatch',
      'store setup',
      'store config',
    ],
    patterns: [
      /createSlice/i,
      /configureStore/i,
      /createAsyncThunk/i,
      /middleware/i,
    ],
    weight: 1.3,
    subcategories: [
      {
        name: 'createSlice',
        displayName: 'createSlice',
        keywords: ['createslice', 'slice', 'reducers', 'extrareducers'],
        patterns: [/createSlice/i, /extraReducers/i],
      },
      {
        name: 'configureStore',
        displayName: 'configureStore',
        keywords: ['configurestore', 'store', 'setup'],
        patterns: [/configureStore/i],
      },
      {
        name: 'createAsyncThunk',
        displayName: 'createAsyncThunk',
        keywords: [
          'createasyncthunk',
          'thunk',
          'async',
          'pending',
          'fulfilled',
        ],
        patterns: [/createAsyncThunk/i, /\.pending/i, /\.fulfilled/i],
      },
      {
        name: 'middleware',
        displayName: 'Middleware',
        keywords: ['middleware', 'listener', 'createlistenermiddleware'],
        patterns: [/middleware/i, /listener/i],
      },
      {
        name: 'devtools',
        displayName: 'DevTools',
        keywords: ['devtools', 'redux devtools', 'time travel'],
        patterns: [/devtools/i],
      },
      {
        name: 'immer',
        displayName: 'Immer Integration',
        keywords: ['immer', 'immutable', 'draft', 'produce'],
        patterns: [/immer/i, /draft/i, /produce/i],
      },
    ],
  },
  {
    name: 'typescript',
    displayName: 'TypeScript',
    labels: ['typescript', 'types'],
    keywords: [
      'typescript',
      'types',
      'typing',
      'inference',
      'generic',
      'type error',
      'type safety',
    ],
    patterns: [/typescript/i, /\bts\b/i, /type\s+error/i, /inference/i],
    weight: 1.2,
  },
  {
    name: 'documentation',
    displayName: 'Documentation',
    labels: ['documentation', 'docs'],
    keywords: [
      'documentation',
      'docs',
      'tutorial',
      'guide',
      'example',
      'readme',
      'unclear',
    ],
    patterns: [/\bdocs?\b/i, /documentation/i, /tutorial/i, /example/i],
    weight: 1.0,
  },
  {
    name: 'build-tooling',
    displayName: 'Build & Tooling',
    labels: ['build', 'tooling'],
    keywords: [
      'build',
      'webpack',
      'vite',
      'rollup',
      'bundler',
      'compilation',
      'transpile',
    ],
    patterns: [/build/i, /webpack/i, /vite/i, /bundler/i],
    weight: 1.0,
    subcategories: [
      {
        name: 'bundling',
        displayName: 'Bundling',
        keywords: ['webpack', 'vite', 'rollup', 'bundler', 'build tool'],
        patterns: [/webpack/i, /vite/i, /rollup/i],
      },
      {
        name: 'dependencies',
        displayName: 'Dependencies',
        keywords: [
          'dependency',
          'dependencies',
          'package',
          'version conflict',
          'peer dependency',
        ],
        patterns: [/dependency/i, /peer\s+dep/i],
      },
    ],
  },
  {
    name: 'publishing',
    displayName: 'Publishing & Deployment',
    labels: ['publishing', 'deployment'],
    keywords: [
      'npm',
      'publishing',
      'publish',
      'provenance',
      'trusted publishing',
      'deployment',
      'deploy',
      'release',
      'package',
      'registry',
      'npm publish',
    ],
    patterns: [
      /\bpublish(ing)?\b/i,
      /\bnpm\b/i,
      /provenance/i,
      /trusted\s+publishing/i,
    ],
    weight: 1.5,
  },
  {
    name: 'architecture',
    displayName: 'Architecture & Design',
    labels: ['architecture', 'design'],
    keywords: [
      'architecture',
      'design',
      'refactor',
      'restructure',
      'api design',
      'breaking change',
      'design pattern',
    ],
    patterns: [/architecture/i, /\bapi\s+design\b/i, /design\s+pattern/i],
    weight: 1.3,
  },
  {
    name: 'migration',
    displayName: 'Migration & Upgrades',
    labels: ['migration', 'upgrade'],
    keywords: [
      'migration',
      'migrate',
      'upgrade',
      'v1 to v2',
      'breaking change',
      'migration guide',
      'upgrade path',
    ],
    patterns: [/migrat(e|ion)/i, /upgrade/i, /v\d+\s+to\s+v\d+/i],
    weight: 1.4,
  },
  {
    name: 'future-planning',
    displayName: 'Future Planning & Proposals',
    labels: ['roadmap', 'proposal', 'rfc'],
    keywords: [
      'roadmap',
      'future',
      'v2',
      'v3',
      'next version',
      'planning',
      'proposal',
      'rfc',
    ],
    patterns: [/roadmap/i, /\bv\d+\b/i, /\brfc\b/i],
    weight: 1.2,
  },
  {
    name: 'uncategorized',
    displayName: 'Uncategorized',
    labels: [],
    keywords: [],
    patterns: [],
    weight: 0,
  },
]

/**
 * Get category by name
 */
export function getCategoryByName(name: string): CategoryConfig | undefined {
  return CATEGORIES.find((cat) => cat.name === name)
}

/**
 * Get all category names
 */
export function getAllCategoryNames(): string[] {
  return CATEGORIES.map((cat) => cat.name)
}
