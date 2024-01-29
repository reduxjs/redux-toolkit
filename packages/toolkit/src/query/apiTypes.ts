import type {
  EndpointDefinitions,
  EndpointBuilder,
  EndpointDefinition,
  UpdateDefinitions,
  QueryDefinition,
  ResultTypeFrom,
  QueryArgFrom,
  MutationDefinition,
  AddTagTypes,
  EnhanceEndpoint,
} from './endpointDefinitions'
import type {
  UnionToIntersection,
  NoInfer,
  WithRequiredProp,
  Id,
} from './tsHelpers'
import type { CoreModule } from '@reduxjs/toolkit/query'
import type { CreateApiOptions } from './createApi'
import type { BaseQueryFn } from './baseQueryTypes'
import type { CombinedState, MutationKeys, QueryKeys } from './core/apiState'
import type { UnknownAction } from '@reduxjs/toolkit'

export interface ApiModules<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BaseQuery extends BaseQueryFn,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ReducerPath extends string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TagTypes extends string,
> {}

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

export type BaseApiMethods<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string,
  Enhancers extends ModuleName = CoreModule,
> = {
  /**
   * A function to inject the endpoints into the original API, but also give you that same API with correct types for these endpoints back. Useful with code-splitting.
   */
  injectEndpoints<NewDefinitions extends EndpointDefinitions>(_: {
    endpoints: (
      build: EndpointBuilder<BaseQuery, TagTypes, ReducerPath>,
    ) => NewDefinitions
    overrideExisting?: boolean
  }): Api<
    BaseQuery,
    Definitions & NewDefinitions,
    ReducerPath,
    TagTypes,
    Enhancers
  >
  /**
   *A function to add tag types to a generated API. Useful with code-generation.
   */
  addTagTypes<NewTagTypes extends string = never>(
    ...addTagTypes: readonly NewTagTypes[]
  ): Api<
    BaseQuery,
    AddTagTypes<Definitions, TagTypes | NewTagTypes>,
    ReducerPath,
    TagTypes | NewTagTypes,
    Enhancers
  >

  /**
   *A function to enhance a generated API endpoint with additional information. Useful with code-generation.
   */
  enhanceEndpoint<
    QueryName extends QueryKeys<Definitions>,
    ResultType = ResultTypeFrom<Definitions[QueryName]>,
    QueryArg = QueryArgFrom<Definitions[QueryName]>,
  >(
    queryName: QueryName,
    partialDefinition:
      | Partial<
          QueryDefinition<
            QueryArg,
            BaseQuery,
            TagTypes,
            ResultType,
            ReducerPath
          >
        >
      | ((
          definition: QueryDefinition<
            QueryArg,
            BaseQuery,
            TagTypes,
            ResultType,
            ReducerPath
          >,
        ) => void),
  ): Api<
    BaseQuery,
    Id<
      Omit<Definitions, QueryName> &
        Record<
          QueryName,
          EnhanceEndpoint<Definitions[QueryName], QueryArg, ResultType>
        >
    >,
    ReducerPath,
    TagTypes,
    Enhancers
  >

  /**
   *A function to enhance a generated API with additional information. Useful with code-generation.
   */
  enhanceEndpoint<
    MutationName extends MutationKeys<Definitions>,
    ResultType = ResultTypeFrom<Definitions[MutationName]>,
    QueryArg = QueryArgFrom<Definitions[MutationName]>,
  >(
    mutationName: MutationName,
    partialDefinition:
      | Partial<
          MutationDefinition<
            QueryArg,
            BaseQuery,
            TagTypes,
            ResultType,
            ReducerPath
          >
        >
      | ((
          definition: MutationDefinition<
            QueryArg,
            BaseQuery,
            TagTypes,
            ResultType,
            ReducerPath
          >,
        ) => void),
  ): Api<
    BaseQuery,
    Id<
      Omit<Definitions, MutationName> &
        Record<
          MutationName,
          EnhanceEndpoint<Definitions[MutationName], QueryArg, ResultType>
        >
    >,
    ReducerPath,
    TagTypes,
    Enhancers
  >

  /**
   *A function to enhance a generated API with additional information. Useful with code-generation.
   * @deprecated Please use `enhanceEndpoint` and `addTagType` instead
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

export type Api<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string,
  Enhancers extends ModuleName = CoreModule,
> = UnionToIntersection<
  ApiModules<BaseQuery, Definitions, ReducerPath, TagTypes>[Enhancers]
> &
  BaseApiMethods<BaseQuery, Definitions, ReducerPath, TagTypes, Enhancers>
