import { AnyAction, Middleware, ThunkDispatch } from '@reduxjs/toolkit';
import { RootState } from './apiState';
import { EndpointDefinitions } from './endpointDefinitions';

export function buildMiddleware<Definitions extends EndpointDefinitions, ReducerPath extends string>() {
  const middleware: Middleware<{}, RootState<Definitions, ReducerPath>, ThunkDispatch<any, any, AnyAction>> = (api) => (
    next
  ) => (action) => {
    const result = next(action);
    // TODO: invalidation & re-running queries
    return result;
  };

  return { middleware };
}
