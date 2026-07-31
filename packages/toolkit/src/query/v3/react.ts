/**
 * RTK Query v3 prototype: React bindings as a plain enhancer function.
 *
 * `reactify(api)` attaches the existing React hooks to a v3 core api
 * instance at runtime, and returns the same instance under a wider type that
 * includes the generated hooks. This replaces the module-registry +
 * declaration-merge mechanism (`ApiModules` + `UnionToIntersection`) with a
 * plain generic function: the hook surface is computed from the `$types`
 * phantom bag via a mapped type.
 *
 * Notes for the prototype:
 * - The existing `reactHooksModule` runtime is reused unchanged. Its `init`
 *   still writes `batch` into the shared context (the E1 seam); v3 core no
 *   longer reads it, so this is inert here and would be deleted in a real
 *   implementation.
 * - `reactify` mutates the api instance (hooks are attached in place, as the
 *   module system always did). The narrower, hook-less type of the original
 *   reference stays valid; only the returned reference exposes the hooks.
 * - `injectEndpoints` called on a reactified api generates hooks for the new
 *   endpoints, both at runtime (the react module is registered in the
 *   plumbing's module list) and in the returned type.
 */
import type { BaseQueryFn } from '../baseQueryTypes'
import type { QueryKeys } from '../core/apiState'
import type { PrefetchOptions } from '../core/module'
import type {
  EndpointDefinitions,
  InfiniteQueryDefinition,
  MutationDefinition,
  QueryArgFrom,
  QueryDefinition,
} from '../endpointDefinitions'
import type {
  InfiniteQueryHooks,
  MutationHooks,
  QueryHooks,
} from '../react/buildHooks'
import type { ReactHooksModuleOptions } from '../react/module'
import { reactHooksModule } from '../react/module'
import type { HooksWithUniqueNames } from '../react/namedHooks'
import type {
  ApiV3Base,
  BoundCreateApiOptions,
  EnhancedInfiniteQueryDefs,
  EnhancedMutationDefs,
  EnhancedQueryDefs,
  InfiniteQueryDefKeys,
  InfiniteQueryEndpointEnhancement,
  InjectEndpointsArg,
  MutationDefKeys,
  MutationEndpointEnhancement,
  QueryDefKeys,
  QueryEndpointEnhancement,
  ToDefinitions,
} from './apiTypes'
import type { ApiBuilder, ApiBuilderConfig } from './builder'
import { createApiBuilder as coreCreateApiBuilder } from './builder'
import { getApiPlumbing } from './createApi'
import type { DefsShape } from './endpointCreators'

/**
 * The hook surface generated for a definitions map: per-endpoint hook
 * bundles under `endpoints`, `usePrefetch`, and the uniquely-named
 * `useXQuery`/`useXMutation` aliases.
 */
export type HooksSurface<Definitions extends EndpointDefinitions> = {
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
        : Definitions[K] extends InfiniteQueryDefinition<
              any,
              any,
              any,
              any,
              any
            >
          ? InfiniteQueryHooks<Definitions[K]>
          : never
  }
  usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    options?: PrefetchOptions,
  ): (
    arg: QueryArgFrom<Definitions[EndpointName]>,
    options?: PrefetchOptions,
  ) => void
} & HooksWithUniqueNames<Definitions>

/** A v3 api with React hooks attached. */
export type ReactifiedApi<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
> = ApiV3Base<BaseQuery, Defs, ReducerPath, TagTypes> &
  HooksSurface<ToDefinitions<Defs, BaseQuery, TagTypes, ReducerPath>> & {
    injectEndpoints<NewDefs extends DefsShape>(
      _: InjectEndpointsArg<NewDefs, Defs & NewDefs>,
    ): ReactifiedApi<BaseQuery, Defs & NewDefs, ReducerPath, TagTypes>
    addTagTypes<NewTagTypes extends string = never>(
      ...tags: NewTagTypes[]
    ): ReactifiedApi<BaseQuery, Defs, ReducerPath, TagTypes | NewTagTypes>
    enhanceEndpoint<
      Name extends QueryDefKeys<Defs>,
      NewResult = Defs[Name]['result'],
      NewArg = Defs[Name]['arg'],
    >(
      name: Name,
      enhancement: QueryEndpointEnhancement<
        NewArg,
        NewResult,
        Defs[Name],
        Defs,
        BaseQuery,
        TagTypes,
        ReducerPath
      >,
    ): ReactifiedApi<
      BaseQuery,
      EnhancedQueryDefs<Defs, Name, NewResult, NewArg>,
      ReducerPath,
      TagTypes
    >
    enhanceEndpoint<
      Name extends MutationDefKeys<Defs>,
      NewResult = Defs[Name]['result'],
      NewArg = Defs[Name]['arg'],
    >(
      name: Name,
      enhancement: MutationEndpointEnhancement<
        NewArg,
        NewResult,
        Defs[Name],
        BaseQuery,
        TagTypes,
        ReducerPath
      >,
    ): ReactifiedApi<
      BaseQuery,
      EnhancedMutationDefs<Defs, Name, NewResult, NewArg>,
      ReducerPath,
      TagTypes
    >
    enhanceEndpoint<
      Name extends InfiniteQueryDefKeys<Defs>,
      NewResult = Defs[Name]['result'],
      NewArg = Defs[Name]['arg'],
    >(
      name: Name,
      enhancement: InfiniteQueryEndpointEnhancement<
        NewArg,
        NewResult,
        Defs[Name],
        BaseQuery,
        TagTypes,
        ReducerPath
      >,
    ): ReactifiedApi<
      BaseQuery,
      EnhancedInfiniteQueryDefs<Defs, Name, NewResult, NewArg>,
      ReducerPath,
      TagTypes
    >
  }

/**
 * Attaches React hooks to a v3 core api instance.
 *
 * ```ts
 * import { createApi, query } from '@reduxjs/toolkit/query/v3'
 * import { reactify } from '@reduxjs/toolkit/query/v3/react'
 *
 * const coreApi = createApi({ baseQuery, endpoints: { ... } })
 * export const api = reactify(coreApi)
 * // api.useGetTodosQuery, api.endpoints.getTodos.useQuery, ...
 * ```
 */
export function reactify<
  BaseQuery extends BaseQueryFn,
  Defs extends DefsShape,
  ReducerPath extends string,
  TagTypes extends string,
>(
  api: ApiV3Base<BaseQuery, Defs, ReducerPath, TagTypes>,
  options?: ReactHooksModuleOptions,
): ReactifiedApi<BaseQuery, Defs, ReducerPath, TagTypes> {
  const plumbing = getApiPlumbing(api)

  const reactModule = reactHooksModule(options).init(
    api as any,
    plumbing.optionsWithDefaults as any,
    plumbing.context,
  )

  // Register for future injectEndpoints calls...
  plumbing.initializedModules.push(reactModule)

  // ...and replay endpoints that were injected before reactification.
  for (const [endpointName, definition] of Object.entries(
    plumbing.context.endpointDefinitions,
  )) {
    reactModule.injectEndpoint(endpointName, definition)
  }

  return api as any
}

/**
 * The React flavor of the api builder: identical creators, but `createApi`
 * returns an api with hooks already attached.
 */
export interface ReactApiBuilder<
  BaseQuery extends BaseQueryFn,
  TagTypes extends string,
  ReducerPath extends string,
> extends Omit<ApiBuilder<BaseQuery, TagTypes, ReducerPath>, 'createApi'> {
  createApi<Defs extends DefsShape>(
    options: BoundCreateApiOptions<BaseQuery, Defs, ReducerPath, TagTypes>,
  ): ReactifiedApi<BaseQuery, Defs, ReducerPath, TagTypes>
}

/**
 * The React entry's `createApiBuilder`: the convenience-already-hooked-up
 * flavor. `build.createApi(...)` returns a reactified api directly.
 *
 * ```ts
 * import { createApiBuilder } from '@reduxjs/toolkit/query/v3/react'
 *
 * const build = createApiBuilder({ baseQuery, tagTypes: ['Todo'] })
 * export const api = build.createApi({ endpoints: { ... } })
 * // api.useGetTodosQuery, ...
 * ```
 */
export function createApiBuilder<
  BaseQuery extends BaseQueryFn,
  const TagTypes extends string = never,
  ReducerPath extends string = 'api',
>(
  config: ApiBuilderConfig<BaseQuery, TagTypes, ReducerPath>,
  hooksOptions?: ReactHooksModuleOptions,
): ReactApiBuilder<BaseQuery, TagTypes, ReducerPath> {
  const coreBuilder = coreCreateApiBuilder(config)
  return {
    ...coreBuilder,
    createApi: (options: any) =>
      reactify(coreBuilder.createApi(options), hooksOptions) as any,
  } as ReactApiBuilder<BaseQuery, TagTypes, ReducerPath>
}
