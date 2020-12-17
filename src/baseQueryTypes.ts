import { QueryApi } from './core/buildThunks';
import { MaybePromise, UnwrapPromise } from './tsHelpers';

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
