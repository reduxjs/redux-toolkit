import { EndpointDefinitions, EndpointBuilder, EndpointDefinition, ReplaceEntityTypes } from './endpointDefinitions';
import { UnionToIntersection, Id, NoInfer } from './tsHelpers';
import { CoreModule } from './core/module';
import { CreateApiOptions } from './createApi';
import { BaseQueryFn } from './baseQueryTypes';

export interface ApiModules<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BaseQuery extends BaseQueryFn,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ReducerPath extends string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EntityTypes extends string
> {}

export type ModuleName = keyof ApiModules<any, any, any, any>;

export type Module<Name extends ModuleName> = {
  name: Name;
  init<
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    EntityTypes extends string
  >(
    api: Api<BaseQuery, EndpointDefinitions, ReducerPath, EntityTypes, ModuleName>,
    options: Required<CreateApiOptions<BaseQuery, Definitions, ReducerPath, EntityTypes>>,
    context: {
      endpointDefinitions: Definitions;
    }
  ): {
    injectEndpoint(endpoint: string, definition: EndpointDefinition<any, any, any, any>): void;
  };
};

export type Api<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string,
  Enhancers extends ModuleName = CoreModule
> = Id<
  Id<UnionToIntersection<ApiModules<BaseQuery, Definitions, ReducerPath, EntityTypes>[Enhancers]>> & {
    injectEndpoints<NewDefinitions extends EndpointDefinitions>(_: {
      endpoints: (build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>) => NewDefinitions;
      overrideExisting?: boolean;
    }): Api<BaseQuery, Definitions & NewDefinitions, ReducerPath, EntityTypes, Enhancers>;
    enhanceEndpoints<NewEntityTypes extends string = never>(_: {
      addEntityTypes?: readonly NewEntityTypes[];
      endpoints?: ReplaceEntityTypes<Definitions, EntityTypes | NoInfer<NewEntityTypes>> extends infer NewDefinitions
        ? {
            [K in keyof NewDefinitions]?: Partial<NewDefinitions[K]> | ((definition: NewDefinitions[K]) => void);
          }
        : never;
    }): Api<
      BaseQuery,
      ReplaceEntityTypes<Definitions, EntityTypes | NewEntityTypes>,
      ReducerPath,
      EntityTypes | NewEntityTypes,
      Enhancers
    >;
  }
>;

export type ApiWithInjectedEndpoints<
  ApiDefinition extends Api<any, any, any, any>,
  Injections extends ApiDefinition extends Api<infer B, any, infer R, infer E>
    ? [Api<B, any, R, E>, ...Api<B, any, R, E>[]]
    : never
> = Omit<ApiDefinition, 'endpoints'> &
  Omit<Injections, 'endpoints'> & {
    endpoints: ApiDefinition['endpoints'] & Partial<UnionToIntersection<Injections[number]['endpoints']>>;
  };
