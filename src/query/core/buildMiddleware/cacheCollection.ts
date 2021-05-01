import { QuerySubstateIdentifier } from '../apiState'
import {
  QueryStateMeta,
  SubMiddlewareApi,
  SubMiddlewareBuilder,
  TimeoutId,
} from './types'

export const build: SubMiddlewareBuilder = ({ reducerPath, api }) => {
  const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {}

  const { removeQueryResult, unsubscribeQueryResult } = api.internalActions

  return (mwApi) => (next) => (action): any => {
    const result = next(action)

    if (unsubscribeQueryResult.match(action)) {
      handleUnsubscribe(action.payload, mwApi)
    }

    if (api.util.resetApiState.match(action)) {
      for (const [key, timeout] of Object.entries(currentRemovalTimeouts)) {
        if (timeout) clearTimeout(timeout)
        delete currentRemovalTimeouts[key]
      }
    }

    return result
  }

  function handleUnsubscribe(
    { queryCacheKey }: QuerySubstateIdentifier,
    api: SubMiddlewareApi
  ) {
    const keepUnusedDataFor = api.getState()[reducerPath].config
      .keepUnusedDataFor
    const currentTimeout = currentRemovalTimeouts[queryCacheKey]
    if (currentTimeout) {
      clearTimeout(currentTimeout)
    }
    currentRemovalTimeouts[queryCacheKey] = setTimeout(() => {
      const subscriptions = api.getState()[reducerPath].subscriptions[
        queryCacheKey
      ]
      if (!subscriptions || Object.keys(subscriptions).length === 0) {
        api.dispatch(removeQueryResult({ queryCacheKey }))
      }
      delete currentRemovalTimeouts![queryCacheKey]
    }, keepUnusedDataFor * 1000)
  }
}
