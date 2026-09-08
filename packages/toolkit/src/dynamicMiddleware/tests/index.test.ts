import type { Middleware, PayloadAction } from '@reduxjs/toolkit'
import {
  configureStore,
  createAction,
  createDynamicMiddleware,
  isAllOf,
  isAction,
} from '@reduxjs/toolkit'
import type { BaseActionCreator } from '../../createAction'

const probeType = 'probeableMW/probe'

export interface ProbeMiddleware extends BaseActionCreator<
  number,
  typeof probeType
> {
  <Id extends number>(id: Id): PayloadAction<Id, typeof probeType>
}

export const probeMiddleware = createAction(probeType) as ProbeMiddleware

const matchId =
  <Id extends number>(id: Id) =>
  (action: any): action is PayloadAction<Id> =>
    action.payload === id

export const makeProbeableMiddleware = <Id extends number>(
  id: Id,
): Middleware<{
  (action: PayloadAction<Id, typeof probeType>): Id
}> => {
  const isMiddlewareAction = isAllOf(probeMiddleware, matchId(id))
  return (api) => (next) => (action) => {
    if (isMiddlewareAction(action)) {
      return id
    }
    return next(action)
  }
}

const staticMiddleware = makeProbeableMiddleware(1)

describe('createDynamicMiddleware', () => {
  it('allows injecting middleware after store instantiation', () => {
    const dynamicInstance = createDynamicMiddleware()
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) =>
        gDM().prepend(dynamicInstance.middleware).concat(staticMiddleware),
    })
    // normal, pre-inject
    expect(store.dispatch(probeMiddleware(2))).toEqual(probeMiddleware(2))
    // static
    expect(store.dispatch(probeMiddleware(1))).toBe(1)

    // inject
    dynamicInstance.addMiddleware(makeProbeableMiddleware(2))

    // injected
    expect(store.dispatch(probeMiddleware(2))).toBe(2)
  })
  it('returns dispatch when withMiddleware is dispatched', () => {
    const dynamicInstance = createDynamicMiddleware()
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().prepend(dynamicInstance.middleware),
    })

    // normal, pre-inject
    expect(store.dispatch(probeMiddleware(2))).toEqual(probeMiddleware(2))

    const dispatch = store.dispatch(
      dynamicInstance.withMiddleware(makeProbeableMiddleware(2)),
    )
    expect(dispatch).toEqual(expect.any(Function))

    expect(dispatch(probeMiddleware(2))).toBe(2)
  })

  it('reuses the applied middleware chain until middleware changes', () => {
    const dynamicInstance = createDynamicMiddleware()
    const firstApplied = vi.fn()
    const secondApplied = vi.fn()
    const firstMiddleware: Middleware = () => (next) => {
      firstApplied()
      return (action) => next(action)
    }
    const secondMiddleware: Middleware = () => (next) => {
      secondApplied()
      return (action) => next(action)
    }
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().prepend(dynamicInstance.middleware),
    })

    dynamicInstance.addMiddleware(firstMiddleware)
    store.dispatch({ type: 'first' })
    store.dispatch({ type: 'second' })

    expect(firstApplied).toHaveBeenCalledTimes(1)

    dynamicInstance.addMiddleware(secondMiddleware)
    store.dispatch({ type: 'third' })
    store.dispatch({ type: 'fourth' })

    expect(firstApplied).toHaveBeenCalledTimes(2)
    expect(secondApplied).toHaveBeenCalledTimes(1)
  })

  it('applies newly added middleware to nested dispatches immediately', () => {
    const dynamicInstance = createDynamicMiddleware()
    const nestedMiddleware = makeProbeableMiddleware(2)
    const addAndDispatch: Middleware = (api) => (next) => (action) => {
      if (isAction(action) && action.type === 'add-and-dispatch') {
        dynamicInstance.addMiddleware(nestedMiddleware)
        return api.dispatch(probeMiddleware(2))
      }
      return next(action)
    }
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().prepend(dynamicInstance.middleware),
    })

    dynamicInstance.addMiddleware(addAndDispatch)

    expect(store.dispatch({ type: 'add-and-dispatch' })).toBe(2)
  })
})
