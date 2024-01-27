import { configureStore } from '@reduxjs/toolkit'
import type { Middleware } from 'redux'

declare const middleware1: Middleware<{
  (_: string): number
}>

declare const middleware2: Middleware<{
  (_: number): string
}>

type ThunkReturn = Promise<'thunk'>
declare const thunkCreator: () => () => ThunkReturn

describe('type tests', () => {
  test('prepend single element', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().prepend(middleware1),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })

  test('prepend multiple (rest)', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().prepend(middleware1, middleware2),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(5)).toBeString()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })

  test('prepend multiple (array notation)', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().prepend([middleware1, middleware2] as const),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(5)).toBeString()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })

  test('concat single element', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().concat(middleware1),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })

  test('prepend multiple (rest)', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().concat(middleware1, middleware2),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(5)).toBeString()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })

  test('concat multiple (array notation)', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().concat([middleware1, middleware2] as const),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(5)).toBeString()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })

  test('concat and prepend', () => {
    const store = configureStore({
      reducer: () => 0,
      middleware: (gDM) => gDM().concat(middleware1).prepend(middleware2),
    })

    expectTypeOf(store.dispatch('foo')).toBeNumber()

    expectTypeOf(store.dispatch(5)).toBeString()

    expectTypeOf(store.dispatch(thunkCreator())).toEqualTypeOf<ThunkReturn>()

    expectTypeOf(store.dispatch('foo')).not.toBeString()
  })
})
