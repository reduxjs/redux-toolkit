import type {
  Api,
  ApiModules,
  BaseQueryFn,
  EndpointDefinitions,
  Module,
  MutationDefinition,
  QueryArgFrom,
  QueryDefinition,
} from '@reduxjs/toolkit/query'
import { isMutationDefinition, isQueryDefinition } from '../endpointDefinitions'
import { safeAssign } from '../tsHelpers'
import { capitalize } from '../utils'
import type { MutationHooks, QueryHooks } from './buildHooks'
import { buildHooks } from './buildHooks'

import type { HooksWithUniqueNames } from './namedHooks'

import {
  batch as rrBatch,
  useDispatch as rrUseDispatch,
  useSelector as rrUseSelector,
  useStore as rrUseStore,
} from 'react-redux'
import { createSelector as _createSelector } from 'reselect'
import type { QueryKeys } from '../core/apiState'
import type { PrefetchOptions } from '../core/module'
import { countObjectKeys } from '../utils/countObjectKeys'

export const reactHooksModuleName = /* @__PURE__ */ Symbol()
export type ReactHooksModule = typeof reactHooksModuleName

declare module '@reduxjs/toolkit/query' {
  export interface ApiModules<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ReducerPath extends string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TagTypes extends string,
  > {
    [reactHooksModuleName]: {
      /**
       *  Endpoints based on the input endpoints provided to `createApi`, containing `select`, `hooks` and `action matchers`.
       */
      endpoints: {
        [K in keyof Definitions]: Definitions[K] extends QueryDefinition<
          any,
          any,
          any,
          any,
          any
        >
          ? QueryHooks<Definitions[K]>
          : Definitions[K] extends MutationDefinition<any, any, any, any, any>
            ? MutationHooks<Definitions[K]>
            : never
      }
      /**
       * A hook that accepts a string endpoint name, and provides a callback that when called, pre-fetches the data for that endpoint.
       */
      usePrefetch<EndpointName extends QueryKeys<Definitions>>(
        endpointName: EndpointName,
        options?: PrefetchOptions,
      ): (
        arg: QueryArgFrom<Definitions[EndpointName]>,
        options?: PrefetchOptions,
      ) => void
    } & HooksWithUniqueNames<Definitions>
  }
}

type RR = typeof import('react-redux')

export interface ReactHooksModuleOptions {
  /**
   * The hooks from React Redux to be used
   */
  hooks?: {
    /**
     * The version of the `useDispatch` hook to be used
     */
    useDispatch: RR['useDispatch']
    /**
     * The version of the `useSelector` hook to be used
     */
    useSelector: RR['useSelector']
    /**
     * The version of the `useStore` hook to be used
     */
    useStore: RR['useStore']
  }
  /**
   * The version of the `batchedUpdates` function to be used
   */
  batch?: RR['batch']
  /**
   * Enables performing asynchronous tasks immediately within a render.
   *
   * @example
   *
   * ```ts
   * import {
   *   buildCreateApi,
   *   coreModule,
   *   reactHooksModule
   * } from '@reduxjs/toolkit/query/react'
   *
   * const createApi = buildCreateApi(
   *   coreModule(),
   *   reactHooksModule({ unstable__sideEffectsInRender: true })
   * )
   * ```
   */
  unstable__sideEffectsInRender?: boolean
  /**
   * A selector creator (usually from `reselect`, or matching the same signature)
   */
  createSelector?: typeof _createSelector
}

function buildInjectEndpoint(
  target: Omit<
    ApiModules<any, Record<string, any>, any, any>[ReactHooksModule],
    'usePrefetch'
  >,
  {
    buildMutationHook,
    buildQueryHooks,
  }: Pick<
    ReturnType<typeof buildHooks>,
    'buildQueryHooks' | 'buildMutationHook'
  >,
): ReturnType<Module<ReactHooksModule>['init']>['injectEndpoint'] {
  return function injectEndpoint(endpointName, definition) {
    if (isQueryDefinition(definition)) {
      const {
        useQuery,
        useLazyQuery,
        useLazyQuerySubscription,
        useQueryState,
        useQuerySubscription,
      } = buildQueryHooks(endpointName)
      safeAssign(target.endpoints[endpointName], {
        useQuery,
        useLazyQuery,
        useLazyQuerySubscription,
        useQueryState,
        useQuerySubscription,
      })
      ;(target as any)[`use${capitalize(endpointName)}Query`] = useQuery
      ;(target as any)[`useLazy${capitalize(endpointName)}Query`] = useLazyQuery
    } else if (isMutationDefinition(definition)) {
      const useMutation = buildMutationHook(endpointName)
      safeAssign(target.endpoints[endpointName], {
        useMutation,
      })
      ;(target as any)[`use${capitalize(endpointName)}Mutation`] = useMutation
    }
  }
}

const defaultOptions: Required<ReactHooksModuleOptions> = {
  batch: rrBatch,
  hooks: {
    useDispatch: rrUseDispatch,
    useSelector: rrUseSelector,
    useStore: rrUseStore,
  },
  createSelector: _createSelector,
  unstable__sideEffectsInRender: false,
}

/**
 * Creates a module that generates react hooks from endpoints, for use with `buildCreateApi`.
 *
 *  @example
 * ```ts
 * const MyContext = React.createContext<ReactReduxContextValue>(null as any);
 * const customCreateApi = buildCreateApi(
 *   coreModule(),
 *   reactHooksModule({
 *     hooks: {
 *       useDispatch: createDispatchHook(MyContext),
 *       useSelector: createSelectorHook(MyContext),
 *       useStore: createStoreHook(MyContext)
 *     }
 *   })
 * );
 * ```
 *
 * @returns A module for use with `buildCreateApi`
 */
export const reactHooksModule = (
  moduleOptions?: ReactHooksModuleOptions,
): Module<ReactHooksModule> => {
  const {
    batch,
    hooks,
    createSelector,
    unstable__sideEffectsInRender,
    ...rest
  } = { ...defaultOptions, ...moduleOptions }
  if (process.env.NODE_ENV !== 'production') {
    const hookNames = ['useDispatch', 'useSelector', 'useStore'] as const
    let warned = false
    for (const hookName of hookNames) {
      // warn for old hook options
      if (countObjectKeys(rest) > 0) {
        if ((rest as Partial<typeof hooks>)[hookName]) {
          if (!warned) {
            console.warn(
              'As of RTK 2.0, the hooks now need to be specified as one object, provided under a `hooks` key:' +
                '\n`reactHooksModule({ hooks: { useDispatch, useSelector, useStore } })`',
            )
            warned = true
          }
        }
        // migrate
        // @ts-ignore
        hooks[hookName] = rest[hookName]
      }
      // then make sure we have them all
      if (typeof hooks[hookName] !== 'function') {
        throw new Error(
          `When using custom hooks for context, all ${
            hookNames.length
          } hooks need to be provided: ${hookNames.join(
            ', ',
          )}.\nHook ${hookName} was either not provided or not a function.`,
        )
      }
    }
  }

  return {
    name: reactHooksModuleName,
    init(api, { serializeQueryArgs }, context) {
      const anyApi = api as any as Api<
        any,
        Record<string, any>,
        any,
        any,
        ReactHooksModule
      >
      const { buildQueryHooks, buildMutationHook, usePrefetch } = buildHooks({
        api,
        moduleOptions: {
          batch,
          hooks,
          unstable__sideEffectsInRender,
          createSelector,
        },
        serializeQueryArgs,
        endpointDefinitions: context.endpointDefinitions,
      })

      safeAssign(anyApi, { usePrefetch })
      safeAssign(context, { batch })

      return {
        injectEndpoint: buildInjectEndpoint(anyApi, {
          buildMutationHook,
          buildQueryHooks,
        }),
      }
    },
  }
}

export const buildHooksForApi = <
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string,
>(
  api: Api<BaseQuery, Definitions, ReducerPath, TagTypes>,
  options?: ReactHooksModuleOptions,
): ApiModules<
  BaseQuery,
  Definitions,
  ReducerPath,
  TagTypes
>[ReactHooksModule] => {
  const { batch, hooks, unstable__sideEffectsInRender, createSelector } = {
    ...defaultOptions,
    ...options,
  }

  const { buildQueryHooks, buildMutationHook, usePrefetch } = buildHooks({
    api,
    moduleOptions: {
      batch,
      hooks,
      unstable__sideEffectsInRender,
      createSelector,
    },
    serializeQueryArgs: api.internal.options.serializeQueryArgs,
    endpointDefinitions: api.internal.endpoints,
  })

  const result: {
    endpoints: Record<string, QueryHooks<any> | MutationHooks<any>>
    usePrefetch: typeof usePrefetch
  } = {
    endpoints: {},
    usePrefetch,
  }

  const injectEndpoint = buildInjectEndpoint(result, {
    buildMutationHook,
    buildQueryHooks,
  })

  for (const [endpointName, definition] of Object.entries(
    api.internal.endpoints,
  )) {
    result.endpoints[endpointName] = {} as any
    injectEndpoint(endpointName, definition)
  }
  return result as any
}
