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
        name: 'code-generation',
        displayName: 'Code Generation',
        keywords: ['codegen', 'code generation', 'openapi', 'swagger'],
        patterns: [/code[-\s]?gen/i, /openapi/i, /swagger/i],
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
        keywords: ['optimistic', 'optimistic update', 'onquerystarted'],
        patterns: [/optimistic/i, /onQueryStarted/i],
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
    name: 'core',
    displayName: 'Core Redux Toolkit',
    labels: ['core'],
    keywords: [
      'createslice',
      'configurstore',
      'createasyncthunk',
      'middleware',
      'reducer',
      'action',
      'dispatch',
      'store',
    ],
    patterns: [
      /createSlice/i,
      /configureStore/i,
      /createAsyncThunk/i,
      /middleware/i,
    ],
    weight: 1.5,
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
    weight: 1.5,
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
