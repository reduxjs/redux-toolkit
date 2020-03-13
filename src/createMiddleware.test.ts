import { createMiddleware } from './createMiddleware'
import { createAction } from './createAction'

describe('createMiddleware', () => {
  const action1 = createAction('a1')
  const action2 = createAction('a2')
  const action3 = createAction('a3')
  const action4 = createAction('a4')
  const action5 = createAction('a5')
  const action6 = createAction('a6')
  const actionWithPayload1 = createAction<string>('ap1')
  const actionWithPayload2 = createAction<number>('ap2')

  describe('without payload', () => {
    const dispatchSpy = jest.fn()
    const store = { dispatch: dispatchSpy, getState: () => ({}) }
    const next = jest.fn()

    it('should dispatch action from synchronous case', () => {
      const middleware = createMiddleware(builder =>
        builder.addCase(action1, (action, dispatch) => {
          dispatch(action2())
        })
      )
      middleware(store)(next)(action1())
      expect(dispatchSpy).toHaveBeenCalledWith(action2())
    })

    it('should dispatch action from asynchronous case', () => {
      const middleware = createMiddleware(builder =>
        builder.addCase(action1, async (action, dispatch) => {
          await new Promise(res => setTimeout(res, 0))
          dispatch(action2())
        })
      )
      middleware(store)(next)(action1())
      expect(dispatchSpy).toHaveBeenCalledWith(action2())
    })
  })

  describe('with payload', () => {
    const dispatchSpy = jest.fn()
    const store = { dispatch: dispatchSpy, getState: () => ({}) }
    const next = jest.fn()

    it('should dispatch action from synchronous case', () => {
      const middleware = createMiddleware(builder =>
        builder.addCase(actionWithPayload1, (action, dispatch) => {
          dispatch(actionWithPayload2(Number(action.payload)))
        })
      )
      middleware(store)(next)(actionWithPayload1('123'))
      expect(dispatchSpy).toHaveBeenCalledWith(actionWithPayload2(123))
    })

    it('should dispatch action from asynchronous case', () => {
      const middleware = createMiddleware(builder =>
        builder.addCase(actionWithPayload1, async (action, dispatch) => {
          await new Promise(res => res)
          dispatch(actionWithPayload2(Number(action.payload)))
        })
      )
      middleware(store)(next)(actionWithPayload1('123'))
      expect(dispatchSpy).toHaveBeenCalledWith(actionWithPayload2(123))
    })
  })

  describe('multiple cases', () => {
    const dispatchSpy = jest.fn()
    const store = { dispatch: dispatchSpy, getState: () => ({}) }
    const next = jest.fn()

    const middleware = createMiddleware(builder =>
      builder
        .addCase(action1, (action, dispatch) => {
          dispatch(action4)
        })
        .addCase(action2, (action, dispatch) => {
          dispatch(action5)
        })
        .addCase(action3, (action, dispatch) => {
          dispatch(action6)
        })
    )
    middleware(store)(next)(action4())
    expect(dispatchSpy).not.toHaveBeenCalled()

    middleware(store)(next)(action2())
    expect(dispatchSpy).not.toHaveBeenCalledWith(action4)
    expect(dispatchSpy).not.toHaveBeenCalledWith(action6)
    expect(dispatchSpy).toHaveBeenCalledWith(action5)
  })
})
