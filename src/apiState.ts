import { SerializedError } from '@reduxjs/toolkit';
import { BaseQueryError } from './apiTypes';
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

export type RefetchConfigOptions = {
  refetchOnMountOrArgChange: boolean | number;
  refetchOnReconnect: boolean;
  refetchOnFocus: boolean;
};

export enum QueryStatus {
  uninitialized = 'uninitialized',
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}

export type RequestStatusFlags =
  | {
      status: QueryStatus.uninitialized;
      isUninitialized: true;
      isLoading: false;
      isSuccess: false;
      isError: false;
    }
  | {
      status: QueryStatus.pending;
      isUninitialized: false;
      isLoading: true;
      isSuccess: false;
      isError: false;
    }
  | {
      status: QueryStatus.fulfilled;
      isUninitialized: false;
      isLoading: false;
      isSuccess: true;
      isError: false;
    }
  | {
      status: QueryStatus.rejected;
      isUninitialized: false;
      isLoading: false;
      isSuccess: false;
      isError: true;
    };

export function getRequestStatusFlags(status: QueryStatus): RequestStatusFlags {
  return {
    status,
    isUninitialized: status === QueryStatus.uninitialized,
    isLoading: status === QueryStatus.pending,
    isSuccess: status === QueryStatus.fulfilled,
    isError: status === QueryStatus.rejected,
  } as any;
}

export type SubscriptionOptions = {
  pollingInterval?: number;
  refetchOnReconnect?: boolean;
  refetchOnFocus?: boolean;
};
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
  error?:
    | SerializedError
    | (D extends QueryDefinition<any, infer BaseQuery, any, any> ? BaseQueryError<BaseQuery> : never);
  endpoint: string;
  startedTimeStamp: number;
  fulfilledTimeStamp?: number;
};

export type QuerySubState<D extends BaseEndpointDefinition<any, any, any>> = Id<
  | ({
      status: QueryStatus.fulfilled;
    } & WithRequiredProp<BaseQuerySubState<D>, 'data' | 'fulfilledTimeStamp'> & { error: undefined })
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
  error?:
    | SerializedError
    | (D extends MutationDefinition<any, infer BaseQuery, any, any> ? BaseQueryError<BaseQuery> : never);
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

export type CombinedState<D extends EndpointDefinitions, E extends string, ReducerPath extends string> = {
  queries: QueryState<D>;
  mutations: MutationState<D>;
  provided: InvalidationState<E>;
  subscriptions: SubscriptionState;
  config: ConfigState<ReducerPath>;
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

export type ConfigState<ReducerPath> = RefetchConfigOptions & {
  reducerPath: ReducerPath;
  online: boolean;
  focused: boolean;
} & ModifiableConfigState;

export type ModifiableConfigState = {
  keepUnusedDataFor: number;
} & RefetchConfigOptions;

export type MutationState<D extends EndpointDefinitions> = {
  [requestId: string]: MutationSubState<D[string]> | undefined;
};

export type RootState<
  Definitions extends EndpointDefinitions,
  EntityTypes extends string,
  ReducerPath extends string
> = {
  [P in ReducerPath]: CombinedState<Definitions, EntityTypes, P>;
};
