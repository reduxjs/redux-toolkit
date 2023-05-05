import type { StoreEnhancer } from 'redux'
import type { AutoBatchOptions } from './autoBatchEnhancer'
import { autoBatchEnhancer } from './autoBatchEnhancer'
import { EnhancerArray } from './utils'
import type { Middlewares } from './configureStore'
import type { ExtractDispatchExtensions } from './tsHelpers'

type GetDefaultEnhancersOptions = {
  autoBatch?: boolean | AutoBatchOptions
}

export type GetDefaultEnhancers<M extends Middlewares<any>> = (
  options?: GetDefaultEnhancersOptions
) => EnhancerArray<[StoreEnhancer<{ dispatch: ExtractDispatchExtensions<M> }>]>

export const buildGetDefaultEnhancers = <M extends Middlewares<any>>(
  middlewareEnhancer: StoreEnhancer<{ dispatch: ExtractDispatchExtensions<M> }>
): GetDefaultEnhancers<M> =>
  function getDefaultEnhancers(options) {
    const { autoBatch = true } = options ?? {}

    let enhancerArray = new EnhancerArray<StoreEnhancer[]>(middlewareEnhancer)
    if (autoBatch) {
      enhancerArray.push(
        autoBatchEnhancer(typeof autoBatch === 'object' ? autoBatch : undefined)
      )
    }
    return enhancerArray as any
  }
