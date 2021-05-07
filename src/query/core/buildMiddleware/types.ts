import {
  AnyAction,
  AsyncThunk,
  AsyncThunkAction,
  Middleware,
  MiddlewareAPI,
  ThunkDispatch,
} from '@reduxjs/toolkit'

import { Api, ApiContext } from '../../apiTypes'
import { AssertTagTypes, EndpointDefinitions } from '../../endpointDefinitions'
import { QueryStatus, QuerySubState, RootState } from '../apiState'
import { MutationThunkArg, QueryThunkArg, ThunkResult } from '../buildThunks'

export type QueryStateMeta<T> = Record<string, undefined | T>
export type TimeoutId = ReturnType<typeof setTimeout>

export interface BuildMiddlewareInput<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string
> {
  reducerPath: ReducerPath
  context: ApiContext<Definitions>
  queryThunk: AsyncThunk<ThunkResult, QueryThunkArg, {}>
  mutationThunk: AsyncThunk<ThunkResult, MutationThunkArg, {}>
  api: Api<any, Definitions, ReducerPath, TagTypes>
  assertTagType: AssertTagTypes
}

export type SubMiddlewareApi = MiddlewareAPI<
  ThunkDispatch<any, any, AnyAction>,
  RootState<EndpointDefinitions, string, string>
>

export interface BuildSubMiddlewareInput
  extends BuildMiddlewareInput<EndpointDefinitions, string, string> {
  refetchQuery(
    querySubState: Exclude<
      QuerySubState<any>,
      { status: QueryStatus.uninitialized }
    >,
    queryCacheKey: string,
    override?: Partial<QueryThunkArg>
  ): AsyncThunkAction<ThunkResult, QueryThunkArg, {}>
}

export type SubMiddlewareBuilder = (
  input: BuildSubMiddlewareInput
) => Middleware<
  {},
  RootState<EndpointDefinitions, string, string>,
  ThunkDispatch<any, any, AnyAction>
>
