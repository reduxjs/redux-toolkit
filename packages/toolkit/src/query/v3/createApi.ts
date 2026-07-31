/**
 * RTK Query v3 prototype: `createApi` runtime assembly.
 *
 * Mirrors the existing `buildCreateApi`/`baseCreateApi` assembly
 * (../createApi.ts) with these differences:
 *
 * - The returned api object carries its bound endpoint creators
 *   (`api.query`, `api.mutation`, `api.infiniteQuery` — see ./creators.ts),
 *   so an api created with no endpoints is a fully usable base api that
 *   endpoints are injected into. The optional `endpoints` option on
 *   `createApi` is a callback receiving the same creators (the one-call
 *   form), and `injectEndpoints` accepts either a plain object map built
 *   with the api's creators or that same callback shape.
 * - Each endpoint is either the creator's return value directly (the bare
 *   form) or a thin `{ kind, upsert? }` shell; the cross-endpoint `upsert`
 *   option lives in the shell because it is typed against the whole
 *   endpoint map.
 * - There is no module registry. The core module is initialized directly;
 *   enhancers like `reactify` receive a sanctioned plumbing handle
 *   (construction context + options + initialized-module list) stored on the
 *   api object under a non-exported symbol, so they can register themselves
 *   and replay already-injected endpoints.
 * - The combined `enhanceEndpoints` is replaced by the chainable
 *   `addTagTypes(...tags)` and `enhanceEndpoint(name, enhancement)` methods
 *   (adopting PR #3485 / issue #2730). The object form of `enhanceEndpoint`
 *   can rewrite an endpoint's result/arg types; the runtime is the same
 *   merge/recipe mutation as the 2.x `enhanceEndpoints`.
 * - The `context.batch` plugin seam is gone: `context.batch` stays the plain
 *   pass-through. (React 18+ batches by default.)
 */
import type { UnknownAction } from '@reduxjs/toolkit'
import { weakMapMemoize } from 'reselect'
import type { ApiContext } from '../apiTypes'
import type { BaseQueryFn } from '../baseQueryTypes'
import { coreModule } from '../core/module'
import { nanoid } from '../core/rtkImports'
import { defaultSerializeQueryArgs } from '../defaultSerializeQueryArgs'
import type { EndpointDefinitions } from '../endpointDefinitions'
import {
  ENDPOINT_QUERY,
  isInfiniteQueryDefinition,
} from '../endpointDefinitions'
import type {
  ApiPlumbing,
  ApiV3,
  CreateApiV3Options,
} from './apiTypes'
import { makeEndpointCreators } from './creators'
import type { DefsShape } from './endpointCreators'

/**
 * Internal: key under which the construction plumbing is stored on every v3
 * api object. Not part of the public API surface; consumed by `reactify` (and
 * future enhancers).
 */
export const apiPlumbing = Symbol('rtkq-v3-plumbing')

export function getApiPlumbing(api: unknown): ApiPlumbing {
  const plumbing = (api as Record<PropertyKey, unknown>)[apiPlumbing]
  if (!plumbing) {
    throw new Error(
      'Expected a v3 api instance created by createApi from @reduxjs/toolkit/query/v3',
    )
  }
  return plumbing as ApiPlumbing
}

export function createApi<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape = {},
  ReducerPath extends string = 'api',
  const TagTypes extends string = never,
>(
  options: CreateApiV3Options<BaseQuery, Defs, ReducerPath, TagTypes>,
): ApiV3<BaseQuery, Defs, ReducerPath, TagTypes> {
  const extractRehydrationInfo = weakMapMemoize((action: UnknownAction) =>
    options.extractRehydrationInfo?.(action, {
      reducerPath: (options.reducerPath ?? 'api') as any,
    }),
  )

  const optionsWithDefaults = {
    reducerPath: 'api',
    keepUnusedDataFor: 60,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    invalidationBehavior: 'delayed' as const,
    ...options,
    extractRehydrationInfo,
    serializeQueryArgs(queryArgsApi: any) {
      let finalSerializeQueryArgs = defaultSerializeQueryArgs
      if ('serializeQueryArgs' in queryArgsApi.endpointDefinition) {
        const endpointSQA = queryArgsApi.endpointDefinition.serializeQueryArgs!
        finalSerializeQueryArgs = (queryArgsApi) => {
          const initialResult = endpointSQA(queryArgsApi)
          if (typeof initialResult === 'string') {
            // If the user function returned a string, use it as-is
            return initialResult
          } else {
            // Assume they returned an object (such as a subset of the original
            // query args) or a primitive, and serialize it ourselves
            return defaultSerializeQueryArgs({
              ...queryArgsApi,
              queryArgs: initialResult,
            })
          }
        }
      } else if (options.serializeQueryArgs) {
        finalSerializeQueryArgs = options.serializeQueryArgs
      }

      return finalSerializeQueryArgs(queryArgsApi)
    },
    tagTypes: [...(options.tagTypes || [])],
  }

  const context: ApiContext<EndpointDefinitions> = {
    endpointDefinitions: {},
    batch(fn) {
      fn()
    },
    apiUid: nanoid(),
    extractRehydrationInfo,
    hasRehydrationInfo: weakMapMemoize(
      (action) => extractRehydrationInfo(action) != null,
    ),
  }

  const plumbing: ApiPlumbing = {
    context,
    optionsWithDefaults: optionsWithDefaults as any,
    initializedModules: [],
  }

  // The bound endpoint creators: attached to the api object itself, and
  // passed to `endpoints` callbacks. The "binding" to the base query is
  // type-level only; the runtime creators are static.
  const creators = makeEndpointCreators()

  const api: any = {
    ...creators,
    injectEndpoints,
    addTagTypes,
    enhanceEndpoint,
    [apiPlumbing]: plumbing,
    // Phantom type bag; carries no runtime information.
    $types: null,
  }

  plumbing.initializedModules.push(
    coreModule().init(api, optionsWithDefaults as any, context),
  )

  // Wrap the core middleware so the typed cross-endpoint `upsert` option
  // runs after every fulfilled query fetch. The upsert transform derives
  // descriptors from the endpoint's (post-transformResponse) result, and the
  // entries are written through the existing `upsertQueryEntries` path.
  //
  // Notes:
  // - `executeQuery/fulfilled` is shared by queries and infinite queries;
  //   the definition-kind guard limits upserts to plain queries (matching
  //   the type level, where only query cells accept `upsert`).
  // - Upserts are one level deep by construction: `upsertQueryEntries`
  //   writes cache entries via a reducer, so no further `executeQuery`
  //   actions (and therefore no chained upserts) are triggered.
  // - Definitions are read from `context.endpointDefinitions` at dispatch
  //   time, so late-injected endpoints with `upsert` work automatically.
  const coreMiddleware = api.middleware
  const fulfilledQueryType = `${optionsWithDefaults.reducerPath}/executeQuery/fulfilled`
  api.middleware = (mwApi: any) => (next: any) => {
    const handleAction = coreMiddleware(mwApi)(next)
    return (action: any) => {
      const result = handleAction(action)
      if (action?.type === fulfilledQueryType && action.meta?.arg) {
        const { endpointName, originalArgs } = action.meta.arg
        const definition = context.endpointDefinitions[endpointName] as any
        if (
          definition?.type === ENDPOINT_QUERY &&
          typeof definition.upsert === 'function'
        ) {
          const entries = definition.upsert(action.payload, originalArgs)
          if (entries?.length) {
            mwApi.dispatch(
              api.util.upsertQueryEntries(
                entries.map((entry: any) => ({
                  endpointName: entry.endpoint,
                  arg: entry.arg,
                  value: entry.value,
                })),
              ),
            )
          }
        }
      }
      return result
    }
  }

  // Chainable; registers additional tag types (adopted from PR #3485).
  function addTagTypes(...tags: string[]) {
    for (const tag of tags) {
      if (!optionsWithDefaults.tagTypes.includes(tag as any)) {
        ;(optionsWithDefaults.tagTypes as string[]).push(tag)
      }
    }
    return api
  }

  // Chainable; modifies one endpoint in place (adopted from PR #3485).
  // Definitions are mutated in place, which is already visible to every
  // closure the modules created at inject time (thunks read endpoint options
  // at execution time), so no module re-notification is needed.
  // Unknown endpoint names are silently ignored at runtime (they are a type
  // error), matching the current API's behavior.
  function enhanceEndpoint(
    endpointName: string,
    enhancement: object | ((definition: any) => void),
  ) {
    const definition = context.endpointDefinitions[endpointName]
    if (typeof enhancement === 'function') {
      if (definition) {
        enhancement(definition)
      }
    } else {
      Object.assign(definition || {}, enhancement)
    }
    return api
  }

  function injectEndpoints(inject: {
    endpoints:
      | Record<string, any>
      | ((build: Record<string, any>) => Record<string, any>)
    overrideExisting?: boolean | 'throw'
  }) {
    // The callback form receives the same bound creators the api carries.
    const endpointMap =
      typeof inject.endpoints === 'function'
        ? inject.endpoints(creators)
        : inject.endpoints

    for (const [endpointName, cell] of Object.entries(endpointMap)) {
      // Each cell carries its full definition under the `kind` property
      // (`kind: build.query({...})` — the endpoint body plus the `type`
      // discriminator string). The cell itself carries at most the
      // cross-endpoint `upsert` option. Merging `kind` over the rest (and
      // dropping the `kind` property itself) yields exactly the 2.x
      // definition shape the core runtime dispatches on.
      const { kind, ...rest } = cell as Record<string, any>
      const definition: any = rest
      if (kind && typeof kind === 'object') {
        Object.assign(definition, kind)
      }

      if (
        inject.overrideExisting !== true &&
        endpointName in context.endpointDefinitions
      ) {
        if (inject.overrideExisting === 'throw') {
          throw new Error(
            `called \`injectEndpoints\` to override already-existing endpointName ${endpointName} without specifying \`overrideExisting: true\``,
          )
        } else if (
          typeof process !== 'undefined' &&
          process.env.NODE_ENV === 'development'
        ) {
          console.error(
            `called \`injectEndpoints\` to override already-existing endpointName ${endpointName} without specifying \`overrideExisting: true\``,
          )
        }

        continue
      }

      if (
        typeof process !== 'undefined' &&
        process.env.NODE_ENV === 'development'
      ) {
        if (isInfiniteQueryDefinition(definition)) {
          const { infiniteQueryOptions } = definition
          const { maxPages, getPreviousPageParam } = infiniteQueryOptions

          if (typeof maxPages === 'number') {
            if (maxPages < 1) {
              throw new Error(
                `maxPages for endpoint '${endpointName}' must be a number greater than 0`,
              )
            }

            if (typeof getPreviousPageParam !== 'function') {
              throw new Error(
                `getPreviousPageParam for endpoint '${endpointName}' must be a function if maxPages is used`,
              )
            }
          }
        }
      }

      // v3 renames the 2.x `query` field to `request` to avoid colliding
      // with the `query()` endpoint creator. The core runtime (buildThunks)
      // still reads `definition.query`, so alias it via a getter (a getter,
      // not a copy, so `enhanceEndpoint` recipes that replace `request`
      // stay in sync).
      if ('request' in definition && !('query' in definition)) {
        Object.defineProperty(definition, 'query', {
          get: () => definition.request,
        })
      }

      context.endpointDefinitions[endpointName] = definition
      for (const m of plumbing.initializedModules) {
        m.injectEndpoint(endpointName, definition)
      }
    }

    return api
  }

  // The optional one-call `endpoints` callback is just an inject.
  return options.endpoints
    ? api.injectEndpoints({ endpoints: options.endpoints })
    : api
}
