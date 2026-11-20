import type { UnknownAction } from '@reduxjs/toolkit'
import type { BaseQueryFn } from './baseQueryTypes'
import type { CombinedState, CoreModule } from './core/index'
import type { ApiModules } from './core/module'
import type { CreateApiOptions } from './createApi'
import type {
  AddTagTypes,
  EndpointBuilder,
  EndpointDefinition,
  EndpointDefinitions,
  EndpointEnhancement,
  EnhancedDefinition,
  ResultTypeFrom,
  UpdateDefinitions,
} from './endpointDefinitions'
import type { UnionToIntersection, WithRequiredProp } from './tsHelpers'

export type ModuleName = keyof ApiModules<any, any, any, any>

export type Module<Name extends ModuleName> = {
  name: Name
  init<
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    TagTypes extends string,
  >(
    api: Api<BaseQuery, EndpointDefinitions, ReducerPath, TagTypes, ModuleName>,
    options: WithRequiredProp<
      CreateApiOptions<BaseQuery, Definitions, ReducerPath, TagTypes>,
      | 'reducerPath'
      | 'serializeQueryArgs'
      | 'keepUnusedDataFor'
      | 'refetchOnMountOrArgChange'
      | 'refetchOnFocus'
      | 'refetchOnReconnect'
      | 'invalidationBehavior'
      | 'tagTypes'
    >,
    context: ApiContext<Definitions>,
  ): {
    injectEndpoint(
      endpointName: string,
      definition: EndpointDefinition<any, any, any, any>,
    ): void
  }
}

export interface ApiContext<Definitions extends EndpointDefinitions> {
  apiUid: string
  endpointDefinitions: Definitions
  batch(cb: () => void): void
  extractRehydrationInfo: (
    action: UnknownAction,
  ) => CombinedState<any, any, any> | undefined
  hasRehydrationInfo: (action: UnknownAction) => boolean
}

export const getEndpointDefinition = <
  Definitions extends EndpointDefinitions,
  EndpointName extends keyof Definitions,
>(
  context: ApiContext<Definitions>,
  endpointName: EndpointName,
) => context.endpointDefinitions[endpointName]

type ExtraModules<Modules, Names extends keyof Modules> = [Names] extends [
  never,
]
  ? unknown
  : UnionToIntersection<Modules[Names]>

type EnhanceEndpointDefinitions<
  Definitions extends EndpointDefinitions,
  EndpointName extends keyof Definitions,
  ResultType,
> = {
  [K in keyof Definitions]: K extends EndpointName
    ? EnhancedDefinition<Definitions[K], ResultType>
    : Definitions[K]
}

export type Api<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string,
  Enhancers extends ModuleName = CoreModule,
> = (CoreModule extends Enhancers
  ? ApiModules<BaseQuery, Definitions, ReducerPath, TagTypes>[CoreModule]
  : unknown) &
  ExtraModules<
    ApiModules<BaseQuery, Definitions, ReducerPath, TagTypes>,
    Exclude<Enhancers, CoreModule>
  > & {
    /**
     * A function to inject the endpoints into the original API, but also give you that same API with correct types for these endpoints back. Useful with code-splitting.
     */
    injectEndpoints<NewDefinitions extends EndpointDefinitions>(_: {
      endpoints: (
        build: EndpointBuilder<BaseQuery, TagTypes, ReducerPath>,
      ) => NewDefinitions
      /**
       * Optionally allows endpoints to be overridden if defined by multiple `injectEndpoints` calls.
       *
       * If set to `true`, will override existing endpoints with the new definition.
       * If set to `'throw'`, will throw an error if an endpoint is redefined with a different definition.
       * If set to `false` (or unset), will not override existing endpoints with the new definition, and log a warning in development.
       */
      overrideExisting?: boolean | 'throw'
    }): Api<
      BaseQuery,
      Definitions & NewDefinitions,
      ReducerPath,
      TagTypes,
      Enhancers
    >
    /**
     * Adds tag types to the API, so they can be used in `providesTags` and `invalidatesTags`
     * of existing and later injected endpoints. Useful with code-generation.
     */
    addTagTypes<NewTagTypes extends string = never>(
      ...tagTypes: readonly NewTagTypes[]
    ): Api<
      BaseQuery,
      AddTagTypes<Definitions, TagTypes | NewTagTypes>,
      ReducerPath,
      TagTypes | NewTagTypes,
      Enhancers
    >
    /**
     * Enhances a single endpoint definition. Accepts either a partial definition that is merged into the
     * existing definition, or a callback that receives the existing definition and returns the changes to merge in.
     *
     * If the endpoint has not been injected yet, the enhancement is stored and applied when it is injected.
     * Enhancements are applied in the order they were added. Useful with code-generation.
     *
     * Apply enhancements while setting up the API. Data that is already cached is not refetched or transformed.
     */
    enhanceEndpoint<
      EndpointName extends keyof Definitions & string,
      ResultType = ResultTypeFrom<Definitions[EndpointName]>,
    >(
      endpointName: EndpointName,
      enhancement: EndpointEnhancement<
        Definitions[EndpointName],
        EnhancedDefinition<Definitions[EndpointName], ResultType>
      >,
    ): Api<
      BaseQuery,
      EnhanceEndpointDefinitions<Definitions, EndpointName, ResultType>,
      ReducerPath,
      TagTypes,
      Enhancers
    >
    /**
     * A function to enhance a generated API with additional information. Useful with code-generation.
     *
     * @deprecated Use `addTagTypes` and `enhanceEndpoint` instead. `enhanceEndpoints` will be removed in RTK 3.0.
     */
    enhanceEndpoints<
      NewTagTypes extends string = never,
      NewDefinitions extends EndpointDefinitions = never,
    >(_: {
      addTagTypes?: readonly NewTagTypes[]
      endpoints?: UpdateDefinitions<
        Definitions,
        TagTypes | NoInfer<NewTagTypes>,
        NewDefinitions
      > extends infer NewDefinitions
        ? {
            [K in keyof NewDefinitions]?:
              | Partial<NewDefinitions[K]>
              | ((definition: NewDefinitions[K]) => void)
          }
        : never
    }): Api<
      BaseQuery,
      UpdateDefinitions<Definitions, TagTypes | NewTagTypes, NewDefinitions>,
      ReducerPath,
      TagTypes | NewTagTypes,
      Enhancers
    >
  }
