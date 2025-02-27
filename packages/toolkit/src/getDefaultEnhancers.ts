import type { StoreEnhancer } from 'redux'
import type { AutoBatchOptions } from './autoBatchEnhancer'
import { autoBatchEnhancer } from './autoBatchEnhancer'
import type { Middlewares } from './configureStore'
import type { ExtractDispatchExtensions } from './tsHelpers'
import { Tuple } from './utils'

type GetDefaultEnhancersOptions = {
  autoBatch?: boolean | AutoBatchOptions
}

export type GetDefaultEnhancers<M extends Middlewares<any>> = (
  options?: GetDefaultEnhancersOptions,
) => Tuple<[StoreEnhancer<{ dispatch: ExtractDispatchExtensions<M> }>]>

export const buildGetDefaultEnhancers = <M extends Middlewares<any>>(
  middlewareEnhancer: StoreEnhancer<{ dispatch: ExtractDispatchExtensions<M> }>,
): GetDefaultEnhancers<M> =>
  function getDefaultEnhancers(options) {
    const { autoBatch = true } = options ?? {}

    const enhancerArray = new Tuple<StoreEnhancer[]>(middlewareEnhancer)
    if (autoBatch) {
      enhancerArray.push(
        autoBatchEnhancer(
          typeof autoBatch === 'object' ? autoBatch : undefined,
        ),
      )
    }
    return enhancerArray as any
  }
