import { getDefaultMiddleware, Middleware } from 'src'
import { ThunkMiddleware } from 'redux-thunk'

function expectType<T>(t: T) {
  return t
}

{
  expectType<[ThunkMiddleware, Middleware, Middleware]>(getDefaultMiddleware())
  expectType<[Middleware, Middleware]>(getDefaultMiddleware({ thunk: false }))
  expectType<[ThunkMiddleware, Middleware]>(
    getDefaultMiddleware({ immutableCheck: false })
  )
  expectType<[ThunkMiddleware, Middleware]>(
    getDefaultMiddleware({ serializableCheck: false })
  )
  expectType<[Middleware]>(
    getDefaultMiddleware({ thunk: false, immutableCheck: false })
  )
  expectType<[Middleware]>(
    getDefaultMiddleware({ thunk: false, serializableCheck: false })
  )
  expectType<[ThunkMiddleware]>(
    getDefaultMiddleware({ immutableCheck: false, serializableCheck: false })
  )
  expectType<[]>(
    getDefaultMiddleware({
      thunk: false,
      immutableCheck: false,
      serializableCheck: false
    })
  )
}
