import {
  QueryDefinition,
  MutationDefinition,
  EndpointDefinitions,
  BaseEndpointDefinition,
  ResultTypeFrom,
  QueryArgFrom,
} from './endpointDefinitions';
import { Id, WithRequiredProp } from './tsHelpers';

export type QueryCacheKey = string & { _type: 'queryCacheKey' };
export type QuerySubstateIdentifier = { queryCacheKey: QueryCacheKey };
export type MutationSubstateIdentifier = { requestId: string };

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
  originalArgs: QueryArgFrom<D>;
  internalQueryArgs: unknown;
  requestId: string;
  data?: ResultTypeFrom<D>;
  error?: unknown;
  endpoint: string;
  startedTimeStamp: number;
  fulfilledTimeStamp?: number;
};

export type QuerySubState<D extends BaseEndpointDefinition<any, any, any>> = Id<
  | ({
      status: QueryStatus.fulfilled;
    } & WithRequiredProp<BaseQuerySubState<D>, 'data' | 'fulfilledTimeStamp'>)
  | ({
      status: QueryStatus.pending;
    } & BaseQuerySubState<D>)
  | ({
      status: QueryStatus.rejected;
    } & WithRequiredProp<BaseQuerySubState<D>, 'error'>)
  | {
      status: QueryStatus.uninitialized;
      originalArgs?: undefined;
      internalQueryArgs?: undefined;
      data?: undefined;
      error?: undefined;
      requestId?: undefined;
      endpoint?: string;
      startedTimeStamp?: undefined;
      fulfilledTimeStamp?: undefined;
    }
>;

type BaseMutationSubState<D extends BaseEndpointDefinition<any, any, any>> = {
  originalArgs?: QueryArgFrom<D>;
  internalQueryArgs: unknown;
  data?: ResultTypeFrom<D>;
  error?: unknown;
  endpoint: string;
  startedTimeStamp: number;
  fulfilledTimeStamp?: number;
};

export type MutationSubState<D extends BaseEndpointDefinition<any, any, any>> =
  | ({
      status: QueryStatus.fulfilled;
    } & WithRequiredProp<BaseMutationSubState<D>, 'data' | 'fulfilledTimeStamp'>)
  | ({
      status: QueryStatus.pending;
    } & BaseMutationSubState<D>)
  | ({
      status: QueryStatus.rejected;
    } & WithRequiredProp<BaseMutationSubState<D>, 'error'>)
  | {
      status: QueryStatus.uninitialized;
      originalArgs?: undefined;
      internalQueryArgs?: undefined;
      data?: undefined;
      error?: undefined;
      endpoint?: string;
      startedTimeStamp?: undefined;
      fulfilledTimeStamp?: undefined;
    };

export type CombinedState<D extends EndpointDefinitions, E extends string> = {
  queries: QueryState<D>;
  mutations: MutationState<D>;
  provided: InvalidationState<E>;
  subscriptions: SubscriptionState;
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

export type SubscriptionState = {
  [queryCacheKey: string]: Subscribers | undefined;
};

export type MutationState<D extends EndpointDefinitions> = {
  [requestId: string]: MutationSubState<D[string]> | undefined;
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
