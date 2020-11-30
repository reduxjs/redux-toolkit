/**
 * Note: this file should import all other files for type discovery and declaration merging
 */
import { PatchQueryResultThunk, QueryApi, UpdateQueryResultThunk } from './buildThunks';
import { AnyAction, Middleware, Reducer, ThunkDispatch } from '@reduxjs/toolkit';
import { PrefetchOptions } from './buildHooks';
import {
  EndpointDefinitions,
  EndpointBuilder,
  QueryArgFrom,
  QueryDefinition,
  MutationDefinition,
} from './endpointDefinitions';
import { CombinedState, QueryKeys, QueryStatePhantomType, RootState } from './apiState';
import { InternalActions } from './index';
import { UnionToIntersection } from './tsHelpers';
import { TS41Hooks } from './ts41Types';
import './buildSelectors';

type UnwrapPromise<T> = T extends PromiseLike<infer V> ? V : T;
type MaybePromise<T> = T | PromiseLike<T>;

export type BaseQueryFn<Args = any, Result = unknown, Error = unknown, DefinitionExtraOptions = {}> = (
  args: Args,
  api: QueryApi,
  extraOptions: DefinitionExtraOptions
) => MaybePromise<{ error: Error; data?: undefined } | { error?: undefined; data?: Result }>;

export type BaseQueryEnhancer<AdditionalArgs = unknown, AdditionalDefinitionExtraOptions = unknown, Config = void> = <
  BaseQuery extends BaseQueryFn
>(
  baseQuery: BaseQuery,
  config: Config
) => BaseQueryFn<
  BaseQueryArg<BaseQuery> & AdditionalArgs,
  BaseQueryResult<BaseQuery>,
  BaseQueryError<BaseQuery>,
  BaseQueryExtraOptions<BaseQuery> & AdditionalDefinitionExtraOptions
>;

export type BaseQueryResult<BaseQuery extends BaseQueryFn> = Exclude<
  UnwrapPromise<ReturnType<BaseQuery>>,
  { data: undefined }
>['data'];

export type BaseQueryError<BaseQuery extends BaseQueryFn> = Exclude<
  UnwrapPromise<ReturnType<BaseQuery>>,
  { error: undefined }
>['error'];

export type BaseQueryArg<T extends (arg: any, ...args: any[]) => any> = T extends (arg: infer A, ...args: any[]) => any
  ? A
  : any;

export type BaseQueryExtraOptions<BaseQuery extends BaseQueryFn> = Parameters<BaseQuery>[2];

export type Api<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string
> = {
  reducerPath: ReducerPath;
  internalActions: InternalActions;
  reducer: Reducer<CombinedState<Definitions, EntityTypes> & QueryStatePhantomType<ReducerPath>, AnyAction>;
  middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>>;
  util: {
    updateQueryResult: UpdateQueryResultThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
    patchQueryResult: PatchQueryResultThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
  };
  // If you actually care about the return value, use useQuery
  usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    options?: PrefetchOptions
  ): (arg: QueryArgFrom<Definitions[EndpointName]>, options?: PrefetchOptions) => void;
  injectEndpoints<NewDefinitions extends EndpointDefinitions>(_: {
    endpoints: (build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>) => NewDefinitions;
    overrideExisting?: boolean;
  }): Api<BaseQuery, Definitions & NewDefinitions, ReducerPath, EntityTypes>;
  endpoints: {
    [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any, any>
      ? ApiEndpointQuery<Definitions[K], Definitions>
      : Definitions[K] extends MutationDefinition<any, any, any, any, any>
      ? ApiEndpointMutation<Definitions[K], Definitions>
      : never;
  };
} & TS41Hooks<Definitions>;

export interface ApiEndpointQuery<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends QueryDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions
> {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApiEndpointMutation<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definition extends MutationDefinition<any, any, any, any, any>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions
> {}

export type ApiWithInjectedEndpoints<
  ApiDefinition extends Api<any, any, any, any>,
  Injections extends ApiDefinition extends Api<infer B, any, infer R, infer E>
    ? [Api<B, any, R, E>, ...Api<B, any, R, E>[]]
    : never
> = Omit<ApiDefinition, 'endpoints'> &
  Omit<Injections, 'endpoints'> & {
    endpoints: ApiDefinition['endpoints'] & Partial<UnionToIntersection<Injections[number]['endpoints']>>;
  };
