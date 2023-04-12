import type { AutoBatchOptions, StoreEnhancer } from '.'
import { applyMiddleware } from '.'
import { EnhancerArray, autoBatchEnhancer } from '.'
import type { Middlewares } from './configureStore'
import type { ExcludeFromTuple, ExtractDispatchExtensions } from './tsHelpers'

type GetDefaultEnhancersOptions = {
  autoBatch?: boolean | AutoBatchOptions
}

type AutoBatchEnhancerFor<O> = O extends { autoBatch: false }
  ? never
  : StoreEnhancer

export type GetDefaultEnhancers<M extends Middlewares<any>> = <
  O extends GetDefaultEnhancersOptions
>(
  options?: O
) => EnhancerArray<
  ExcludeFromTuple<
    [
      StoreEnhancer<{ dispatch: ExtractDispatchExtensions<M> }>,
      AutoBatchEnhancerFor<O>
    ],
    never
  >
>

export const buildGetDefaultEnhancers =
  <M extends Middlewares<any>>(middlewares: M): GetDefaultEnhancers<M> =>
  (options) => {
    const { autoBatch = true } = options ?? {}

    let enhancerArray = new EnhancerArray(applyMiddleware(...middlewares))
    if (autoBatch) {
      enhancerArray.push(
        autoBatchEnhancer(typeof autoBatch === 'object' ? autoBatch : undefined)
      )
    }
    return enhancerArray as any
  }
