/**
 * RTK Query v3 prototype: `createApi` runtime assembly.
 *
 * Mirrors the existing `buildCreateApi`/`baseCreateApi` assembly
 * (../createApi.ts) with these differences:
 *
 * - `endpoints` is a plain object of pre-stamped endpoint definitions
 *   (see ./endpointCreators.ts), not a callback receiving a builder.
 * - There is no module registry. The core module is initialized directly;
 *   enhancers like `reactify` receive a sanctioned plumbing handle
 *   (construction context + options + initialized-module list) stored on the
 *   api object under a non-exported symbol, so they can register themselves
 *   and replay already-injected endpoints.
 * - `enhanceEndpoints` is intentionally omitted from the prototype.
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
import { isInfiniteQueryDefinition } from '../endpointDefinitions'
import type {
  ApiPlumbing,
  ApiV3,
  CreateApiV3Options,
} from './apiTypes'
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
  Defs extends DefsShape,
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

  const api: any = {
    injectEndpoints,
    [apiPlumbing]: plumbing,
    // Phantom type bag; carries no runtime information.
    $types: null,
  }

  plumbing.initializedModules.push(
    coreModule().init(api, optionsWithDefaults as any, context),
  )

  function injectEndpoints(inject: {
    endpoints: Record<string, any>
    overrideExisting?: boolean | 'throw'
  }) {
    for (const [endpointName, definition] of Object.entries(
      inject.endpoints,
    )) {
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

      context.endpointDefinitions[endpointName] = definition
      for (const m of plumbing.initializedModules) {
        m.injectEndpoint(endpointName, definition)
      }
    }

    return api
  }

  return api.injectEndpoints({ endpoints: options.endpoints })
}
