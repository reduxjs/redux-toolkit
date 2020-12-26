import type { Api, Module, ModuleName } from './apiTypes';
import type { BaseQueryArg, BaseQueryFn } from './baseQueryTypes';
import { defaultSerializeQueryArgs, SerializeQueryArgs } from './defaultSerializeQueryArgs';
import { DefinitionType, EndpointBuilder, EndpointDefinitions } from './endpointDefinitions';

export interface CreateApiOptions<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string = 'api',
  EntityTypes extends string = never
> {
  baseQuery: BaseQuery;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  endpoints(build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>): Definitions;
  keepUnusedDataFor?: number;
  refetchOnMountOrArgChange?: boolean | number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export type CreateApi<Modules extends ModuleName> = <
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string = 'api',
  EntityTypes extends string = never
>(
  options: CreateApiOptions<BaseQuery, Definitions, ReducerPath, EntityTypes>
) => Api<BaseQuery, Definitions, ReducerPath, EntityTypes, Modules>;

export function buildCreateApi<Modules extends [Module<any>, ...Module<any>[]]>(
  ...modules: Modules
): CreateApi<Modules[number]['name']> {
  return function baseCreateApi(options) {
    const optionsWithDefaults = {
      reducerPath: 'api',
      serializeQueryArgs: defaultSerializeQueryArgs,
      keepUnusedDataFor: 60,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
      ...options,
      entityTypes: [...(options.entityTypes || [])],
    };

    const context = {
      endpointDefinitions: {} as EndpointDefinitions,
    };

    const api = {
      injectEndpoints,
      enhanceEndpoints({ addEntityTypes, endpoints }) {
        if (addEntityTypes) {
          for (const eT of addEntityTypes) {
            if (!optionsWithDefaults.entityTypes.includes(eT as any)) {
              optionsWithDefaults.entityTypes.push(eT as any);
            }
          }
        }
        if (endpoints) {
          for (const [endpoint, partialDefinition] of Object.entries(endpoints)) {
            if (typeof partialDefinition === 'function') {
              partialDefinition(context.endpointDefinitions[endpoint]);
            }
            Object.assign(context.endpointDefinitions[endpoint] || {}, partialDefinition);
          }
        }
        return api;
      },
    } as Api<BaseQueryFn, {}, string, string, Modules[number]['name']>;

    const initializedModules = modules.map((m) => m.init(api as any, optionsWithDefaults, context));

    function injectEndpoints(inject: Parameters<typeof api.injectEndpoints>[0]) {
      const evaluatedEndpoints = inject.endpoints({
        query: (x) => ({ ...x, type: DefinitionType.query } as any),
        mutation: (x) => ({ ...x, type: DefinitionType.mutation } as any),
      });

      for (const [endpoint, definition] of Object.entries(evaluatedEndpoints)) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
          if (!inject.overrideExisting && endpoint in context.endpointDefinitions) {
            console.error(
              `called \`injectEndpoints\` to override already-existing endpoint ${endpoint} without specifying \`overrideExisting: true\``
            );
            continue;
          }
        }
        context.endpointDefinitions[endpoint] = definition;
        for (const m of initializedModules) {
          m.injectEndpoint(endpoint, definition);
        }
      }

      return api as any;
    }

    return api.injectEndpoints({ endpoints: options.endpoints as any });
  };
}
