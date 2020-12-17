import type { Api, Module, ModuleName } from './apiTypes';
import type { BaseQueryArg, BaseQueryFn } from './baseQueryTypes';
import { defaultSerializeQueryArgs, SerializeQueryArgs } from './defaultSerializeQueryArgs';
import { DefinitionType, EndpointBuilder, EndpointDefinitions } from './endpointDefinitions';
import { IS_DEV } from './utils';

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
      entityTypes: [],
      reducerPath: 'api',
      serializeQueryArgs: defaultSerializeQueryArgs,
      keepUnusedDataFor: 60,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
      ...options,
    };

    const context = {
      endpointDefinitions: {} as EndpointDefinitions,
    };

    const api = {
      injectEndpoints,
    } as Api<BaseQueryFn, {}, string, string, Modules[number]['name']>;

    const initializedModules = modules.map((m) => m.init(api as any, optionsWithDefaults, context));

    function injectEndpoints(inject: Parameters<typeof api.injectEndpoints>[0]) {
      const evaluatedEndpoints = inject.endpoints({
        query: (x) => ({ ...x, type: DefinitionType.query } as any),
        mutation: (x) => ({ ...x, type: DefinitionType.mutation } as any),
      });

      for (const [endpoint, definition] of Object.entries(evaluatedEndpoints)) {
        if (IS_DEV()) {
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
