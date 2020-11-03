import {
  QueryDefinition,
  MutationDefinition,
  EndpointDefinitions,
  BaseEndpointDefinition,
} from './endpointDefinitions';

export type QuerySubstateIdentifier = { endpoint: string; serializedQueryArgs: string };
export type MutationSubstateIdentifier = { endpoint: string; requestId: string };

export enum QueryStatus {
  uninitialized = 'uninitialized',
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected',
}
type Subscribers = string[];
type QueryKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any> ? K : never;
}[keyof Definitions];
type MutationKeys<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends MutationDefinition<any, any, any, any> ? K : never;
}[keyof Definitions];
type QueryArgs<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<infer QA, any, any>
  ? QA
  : unknown;
type ResultType<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<any, any, infer RT>
  ? RT
  : unknown;

export type QuerySubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
      error?: undefined;
      subscribers: Subscribers;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
      error?: unknown;
      subscribers: Subscribers;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
      error: unknown;
      subscribers: Subscribers;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgs<D>;
      data: ResultType<D>;
      error?: unknown;
      subscribers: Subscribers;
    };

export type MutationSubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
      error?: undefined;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgs<D>;
      data?: undefined;
      error?: undefined;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgs<D>;
      data?: undefined;
      error?: unknown;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgs<D>;
      data: ResultType<D>;
      error?: undefined;
    };

export type CombinedState<D extends EndpointDefinitions, E extends string> = {
  queries: QueryState<D>;
  mutations: MutationState<D>;
  provided: InvalidationState<E>;
};

export type InvalidationState<EntityTypes extends string> = {
  [_ in EntityTypes]: {
    [id: string]: Array<QuerySubstateIdentifier>;
    [id: number]: Array<QuerySubstateIdentifier>;
  };
};

export type QueryState<D extends EndpointDefinitions> = {
  [K in QueryKeys<D>]?: {
    [_stringifiedArgs in string]?: QuerySubState<D[K]>;
  };
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
