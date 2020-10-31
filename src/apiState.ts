import {
  QueryDefinition,
  MutationDefinition,
  EndpointDefinitions,
  BaseEndpointDefinition,
  EntityDescription,
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
type EntityType<D extends BaseEndpointDefinition<any, any, any>> = D extends QueryDefinition<any, any, infer T, any>
  ? T
  : string;

export type QuerySubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgs<D>;
      data: ResultType<D>;
      subscribers: Subscribers;
      resultingEntities: Array<EntityDescription<EntityType<D>>>;
    };

export type MutationSubState<D extends BaseEndpointDefinition<any, any, any>> =
  | {
      status: QueryStatus.uninitialized;
      arg?: undefined;
      data?: undefined;
    }
  | {
      status: QueryStatus.pending;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
    }
  | {
      status: QueryStatus.rejected;
      arg: QueryArgs<D>;
      data?: ResultType<D>;
    }
  | {
      status: QueryStatus.fulfilled;
      arg: QueryArgs<D>;
      data: ResultType<D>;
    };

export type QueryState<D extends EndpointDefinitions> = {
  queries: {
    [K in QueryKeys<D>]?: {
      [stringifiedArgs in string]?: QuerySubState<D[K]>;
    };
  };
  mutations: {
    [K in MutationKeys<D>]?: {
      [requestId in string]?: MutationSubState<D[K]>;
    };
  };
};
const __phantomType_ReducerPath = Symbol();
export interface QueryStatePhantomType<Identifier extends string> {
  [__phantomType_ReducerPath]: Identifier;
}

export type RootState<Definitions extends EndpointDefinitions, ReducerPath extends string> = {
  [P in ReducerPath]: QueryState<Definitions> & QueryStatePhantomType<P>;
};

export type InternalRootState<ReducerPath extends string> = {
  [P in ReducerPath]: QueryState<any>;
};
