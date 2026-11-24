import { setFlagsFromString } from 'node:v8'
import { runInNewContext } from 'node:vm'
import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query'

setFlagsFromString('--expose-gc')
const gc = runInNewContext('gc') as () => void

async function isCollected(ref: WeakRef<object>) {
  // WeakRef targets stay alive until the current job ends
  await new Promise((resolve) => setTimeout(resolve, 0))
  gc()
  return ref.deref() === undefined
}

test('a kept initiate result does not keep the state from when it settled', async () => {
  const api = createApi({
    baseQuery: fakeBaseQuery(),
    endpoints: (build) => ({
      thing: build.query<number, number>({
        queryFn: async (arg) => ({ data: arg }),
      }),
    }),
  })
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) =>
      gDM({ serializableCheck: false, immutableCheck: false }).concat(
        api.middleware,
      ),
  })

  const result = store.dispatch(api.endpoints.thing.initiate(1))
  await result
  const settledState = new WeakRef(store.getState())

  await store.dispatch(api.endpoints.thing.initiate(2))

  await vi.waitFor(async () => {
    expect(await isCollected(settledState)).toBe(true)
  })
  expect(result.abort).toBeTypeOf('function')
})
