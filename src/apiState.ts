import {
  QueryDefinition,
  MutationDefinition,
  EndpointDefinitions,
  BaseEndpointDefinition,
  QueryArgFrom,
  ResultTypeFrom,
} from './endpointDefinitions';
import { Id, WithRequiredProp } from './tsHelpers';

export type QueryCacheKey = string & { _type: 'queryCacheKey' };
export type QuerySubstateIdentifier = { queryCacheKey: QueryCacheKey };
export type MutationSubstateIdentifier = { endpoint: string; requestId: string };

export enum QueryStatus {
  uninitialized = 'uninitialized',
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

export type SubscriptionOptions = { pollingInterval?: number };
export type Subscribers = { [requestId: string]: SubscriptionOptions };
export type QueryKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any> ? K : never;
}[keyof Definitions];
export type MutationKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, any> ? K : never;
}[keyof Definitions];

type BaseQuerySubState<D extends BaseEndpointDefinition<any, any, any>> = {
  internalQueryArgs: unknown;
  requestId: string;
  data?: ResultTypeFrom<D>;
  error?: unknown;
  subscribers: Subscribers;
  endpoint: string;
};

export type QuerySubState<D extends BaseEndpointDefinition<any, any, any>> = Id<
  | ({
      status: QueryStatus.fulfilled;
    } & WithRequiredProp<BaseQuerySubState<D>, 'data'>)
  | ({
      status: QueryStatus.pending;
    } & BaseQuerySubState<D>)
  | ({
      status: QueryStatus.rejected;
    } & WithRequiredProp<BaseQuerySubState<D>, 'error'>)
  | {
      status: QueryStatus.uninitialized;
      internalQueryArgs?: undefined;
      data?: undefined;
      error?: undefined;
      requestId?: undefined;
      subscribers: Subscribers;
      endpoint?: string;
    }
>;

export type MutationSubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
      error?: undefined;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgFrom<D>;
      data?: undefined;
      error?: undefined;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgFrom<D>;
      data?: undefined;
      error?: unknown;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgFrom<D>;
      data: ResultTypeFrom<D>;
      error?: undefined;
    };

export type CombinedState<D extends EndpointDefinitions, E extends string> = {
  queries: QueryState<D>;
  mutations: MutationState<D>;
  provided: InvalidationState<E>;
};

export type InvalidationState<EntityTypes extends string> = {
  [_ in EntityTypes]: {
    [id: string]: Array<QueryCacheKey>;
    [id: number]: Array<QueryCacheKey>;
  };
};

export type QueryState<D extends EndpointDefinitions> = {
  [queryCacheKey: string]: QuerySubState<D[string]> | undefined;
};

export type MutationState<D extends EndpointDefinitions> = {
  [K in MutationKeys<D>]?: {
    [_requestId in string]?: MutationSubState<D[K]>;
  };
};

const __phantomType_ReducerPath = Symbol();
export interface QueryStatePhantomType<Identifier extends string> {
  [__phantomType_ReducerPath]: Identifier;
}

export type RootState<
  Definitions extends EndpointDefinitions,
  EntityTypes extends string,
  ReducerPath extends string
> = {
  [P in ReducerPath]: CombinedState<Definitions, EntityTypes> & QueryStatePhantomType<P>;
};

export type InternalRootState<ReducerPath extends string> = {
  [_ in ReducerPath]: CombinedState<any, string>;
};
