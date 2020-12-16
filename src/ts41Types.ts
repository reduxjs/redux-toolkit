import { MutationHook, UseQuery } from './buildHooks';
import { EndpointDefinition, EndpointDefinitions, MutationDefinition, QueryDefinition } from './endpointDefinitions';

export type TS41Hooks<Definitions extends EndpointDefinitions> = {
  [K in string & keyof Definitions as TS41HookName<K, Definitions[K]>]: Definitions[K] extends QueryDefinition<
    any,
    any,
    any,
    any
  >
    ? UseQuery<Definitions[K]>
    : Definitions[K] extends MutationDefinition<any, any, any, any>
    ? MutationHook<Definitions[K]>
    : never;
};

type TS41HookName<
  K extends string,
  Definition extends EndpointDefinition<any, any, any, any>
> = `use${Capitalize<K>}${Definition extends QueryDefinition<any, any, any, any> ? 'Query' : 'Mutation'}`;
