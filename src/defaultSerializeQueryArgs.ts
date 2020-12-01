import { QueryCacheKey } from './apiState';

export const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({ endpoint, queryArgs }) => {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than  useQuery({ b: 2, a: 1 })
  return `${endpoint}(${JSON.stringify(queryArgs, Object.keys(queryArgs || {}).sort())})`;
};

export type SerializeQueryArgs<InternalQueryArgs> = (_: {
  queryArgs: any;
  internalQueryArgs: InternalQueryArgs;
  endpoint: string;
}) => string;

export type InternalSerializeQueryArgs<InternalQueryArgs> = (_: {
  queryArgs: any;
  internalQueryArgs: InternalQueryArgs;
  endpoint: string;
}) => QueryCacheKey;
