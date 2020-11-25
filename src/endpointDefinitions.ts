import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from './apiState';
import { BaseQueryFn, BaseQueryResult } from './apiTypes';
import { BaseQueryArg } from './tsHelpers';

const resultType = Symbol();

export interface BaseEndpointDefinition<QueryArg, BaseQuery extends BaseQueryFn, ResultType> {
  query(arg: QueryArg): BaseQueryArg<BaseQuery>;
  transformResponse?(baseQueryReturnValue: BaseQueryResult<BaseQuery>): ResultType | Promise<ResultType>;
  [resultType]?: ResultType;
}

export enum DefinitionType {
  query = 'query',
  mutation = 'mutation',
}

type GetResultDescriptionFn<EntityTypes extends string, ResultType, QueryArg> = (
  result: ResultType,
  arg: QueryArg
) => ReadonlyArray<EntityDescription<EntityTypes>>;

export type FullEntityDescription<EntityType> = { type: EntityType; id?: number | string };
type EntityDescription<EntityType> = EntityType | FullEntityDescription<EntityType>;
type ResultDescription<EntityTypes extends string, ResultType, QueryArg> =
  | ReadonlyArray<EntityDescription<EntityTypes>>
  | GetResultDescriptionFn<EntityTypes, ResultType, QueryArg>;

export interface QueryDefinition<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  EntityTypes extends string,
  ResultType,
  _ReducerPath extends string = string
> extends BaseEndpointDefinition<QueryArg, BaseQuery, ResultType> {
  type: DefinitionType.query;
  provides?: ResultDescription<EntityTypes, ResultType, QueryArg>;
  invalidates?: never;
}

export interface MutationApi<ReducerPath extends string, Context extends {}> {
  dispatch: ThunkDispatch<RootState<any, any, ReducerPath>, unknown, AnyAction>;
  getState(): RootState<any, any, ReducerPath>;
  extra: unknown;
  requestId: string;
  context: Context;
}

export interface MutationDefinition<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  EntityTypes extends string,
  ResultType,
  ReducerPath extends string = string,
  Context = Record<string, any>
> extends BaseEndpointDefinition<QueryArg, BaseQuery, ResultType> {
  type: DefinitionType.mutation;
  invalidates?: ResultDescription<EntityTypes, ResultType, QueryArg>;
  provides?: never;
  onStart?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>): void;
  onError?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, error: unknown): void;
  onSuccess?(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, result: ResultType): void;
}

export type EndpointDefinition<
  QueryArg,
  BaseQuery extends BaseQueryFn,
  EntityTypes extends string,
  ResultType,
  ReducerPath extends string = string
> =
  | QueryDefinition<QueryArg, BaseQuery, EntityTypes, ResultType, ReducerPath>
  | MutationDefinition<QueryArg, BaseQuery, EntityTypes, ResultType, ReducerPath>;

export type EndpointDefinitions = Record<string, EndpointDefinition<any, any, any, any>>;

export function isQueryDefinition(e: EndpointDefinition<any, any, any, any>): e is QueryDefinition<any, any, any, any> {
  return e.type === DefinitionType.query;
}

export function isMutationDefinition(
  e: EndpointDefinition<any, any, any, any>
): e is MutationDefinition<any, any, any, any> {
  return e.type === DefinitionType.mutation;
}

export type EndpointBuilder<BaseQuery extends BaseQueryFn, EntityTypes extends string, ReducerPath extends string> = {
  query<ResultType, QueryArg>(
    definition: Omit<QueryDefinition<QueryArg, BaseQuery, EntityTypes, ResultType>, 'type'>
  ): QueryDefinition<QueryArg, BaseQuery, EntityTypes, ResultType>;
  mutation<ResultType, QueryArg, Context = Record<string, any>>(
    definition: Omit<MutationDefinition<QueryArg, BaseQuery, EntityTypes, ResultType, ReducerPath, Context>, 'type'>
  ): MutationDefinition<QueryArg, BaseQuery, EntityTypes, ResultType, ReducerPath, Context>;
};

export type AssertEntityTypes = <T extends FullEntityDescription<string>>(t: T) => T;

export function calculateProvidedBy<ResultType, QueryArg>(
  description: ResultDescription<string, ResultType, QueryArg> | undefined,
  result: ResultType,
  queryArg: QueryArg,
  assertEntityTypes: AssertEntityTypes
): readonly FullEntityDescription<string>[] {
  if (isFunction(description)) {
    return description(result, queryArg).map(expandEntityDescription).map(assertEntityTypes);
  }
  if (Array.isArray(description)) {
    return description.map(expandEntityDescription).map(assertEntityTypes);
  }
  return [];
}

function isFunction<T>(t: T): t is Extract<T, Function> {
  return typeof t === 'function';
}

function expandEntityDescription(description: EntityDescription<string>): FullEntityDescription<string> {
  return typeof description === 'string' ? { type: description } : description;
}

export type QueryArgFrom<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<
  infer QA,
  any,
  any
>
  ? QA
  : unknown;
export type ResultTypeFrom<D extends BaseEndpointDefinition<any, any, any>> = D extends BaseEndpointDefinition<
  any,
  any,
  infer RT
>
  ? RT
  : unknown;

export type ReducerPathFrom<D extends EndpointDefinition<any, any, any, any>> = D extends EndpointDefinition<
  any,
  any,
  any,
  infer RP
>
  ? RP
  : unknown;

export type EntityTypesFrom<D extends EndpointDefinition<any, any, any, any>> = D extends EndpointDefinition<
  any,
  any,
  infer RP,
  any
>
  ? RP
  : unknown;
