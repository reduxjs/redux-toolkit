import { compose } from 'redux'

import {
  AnyAction,
  createAction,
  Middleware,
  ThunkDispatch,
} from '@reduxjs/toolkit'

import {
  EndpointDefinitions,
  FullTagDescription,
} from '../../endpointDefinitions'
import { QueryStatus, QuerySubState, RootState } from '../apiState'
import { QueryThunkArg } from '../buildThunks'
import { build as buildCacheCollection } from './cacheCollection'
import { build as buildInvalidationByTags } from './invalidationByTags'
import { build as buildPolling } from './polling'
import { BuildMiddlewareInput } from './types'
import { build as buildWindowEventHandling } from './windowEventHandling'
import { build as buildCacheLifecycle } from './cacheLifecycle'
import { build as buildQueryLifecycle } from './queryLifecycle'

export function buildMiddleware<
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  TagTypes extends string
>(input: BuildMiddlewareInput<Definitions, ReducerPath, TagTypes>) {
  const { reducerPath, queryThunk } = input
  const actions = {
    invalidateTags: createAction<
      Array<TagTypes | FullTagDescription<TagTypes>>
    >(`${reducerPath}/invalidateTags`),
  }

  const middlewares = [
    buildCacheCollection,
    buildInvalidationByTags,
    buildPolling,
    buildWindowEventHandling,
    buildCacheLifecycle,
    buildQueryLifecycle,
  ].map((build) =>
    build({
      ...((input as any) as BuildMiddlewareInput<
        EndpointDefinitions,
        string,
        string
      >),
      refetchQuery,
    })
  )
  const middleware: Middleware<
    {},
    RootState<Definitions, string, ReducerPath>,
    ThunkDispatch<any, any, AnyAction>
  > = (mwApi) => (next) => {
    const chain = middlewares.map((middleware) => middleware(mwApi))
    return compose<typeof next>(...chain)(next)
  }

  return { middleware, actions }

  function refetchQuery(
    querySubState: Exclude<
      QuerySubState<any>,
      { status: QueryStatus.uninitialized }
    >,
    queryCacheKey: string,
    override: Partial<QueryThunkArg> = {}
  ) {
    return queryThunk({
      endpointName: querySubState.endpointName,
      originalArgs: querySubState.originalArgs,
      subscribe: false,
      forceRefetch: true,
      startedTimeStamp: Date.now(),
      queryCacheKey: queryCacheKey as any,
      ...override,
    })
  }
}
