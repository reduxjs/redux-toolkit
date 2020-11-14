import { EndpointDefinition, MutationDefinition, QueryDefinition } from './endpointDefinitions';

export type Id<T> = { [K in keyof T]: T[K] } & {};
export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type SwitchEndpoint<
  D extends EndpointDefinition<any, any, any, any>,
  QueryCase,
  MutationCase
> = D extends QueryDefinition<any, any, any, any>
  ? QueryCase
  : D extends MutationDefinition<any, any, any, any>
  ? MutationCase
  : never;

export function assertCast<T>(v: any): asserts v is T {}
