import type {
  AsyncThunkProgressActionCreator,
  AsyncThunkWithProgress,
  ThunkDispatch,
  UnknownAction,
} from '@reduxjs/toolkit'
import {
  createAsyncThunkWithProgress,
  createReducer,
  createSlice,
} from '@reduxjs/toolkit'

const defaultDispatch = (() => {}) as ThunkDispatch<{}, any, UnknownAction>

describe('type tests', () => {
  test('basic usage: `progress` action creator is attached and typed', async () => {
    interface ProgressEvent {
      loaded: number
      total: number
    }

    const uploadFile = createAsyncThunkWithProgress<
      string,
      FormData,
      {},
      ProgressEvent
    >('files/upload', async (formData, thunkAPI, onProgress) => {
      expectTypeOf(onProgress).toEqualTypeOf<
        (progressEvent: ProgressEvent) => void
      >()

      onProgress({ loaded: 0, total: 100 })

      return 'https://example.com/file.png'
    })

    expectTypeOf(uploadFile).toEqualTypeOf<
      AsyncThunkWithProgress<string, FormData, {}, ProgressEvent>
    >()

    expectTypeOf(uploadFile.progress).toEqualTypeOf<
      AsyncThunkProgressActionCreator<FormData, ProgressEvent>
    >()

    const reducer = createReducer({}, (builder) =>
      builder
        .addCase(uploadFile.pending, (_, action) => {
          expectTypeOf(action).toEqualTypeOf<
            ReturnType<(typeof uploadFile)['pending']>
          >()
        })
        .addCase(uploadFile.progress, (_, action) => {
          expectTypeOf(action).toEqualTypeOf<
            ReturnType<(typeof uploadFile)['progress']>
          >()

          expectTypeOf(action.payload).toEqualTypeOf<ProgressEvent>()

          expectTypeOf(action.meta).toEqualTypeOf<{
            arg: FormData
            requestId: string
            requestStatus: 'pending'
          }>()
        })
        .addCase(uploadFile.fulfilled, (_, action) => {
          expectTypeOf(action.payload).toBeString()
        }),
    )

    const promise = defaultDispatch(uploadFile(new FormData()))

    expectTypeOf(promise.requestId).toBeString()

    const result = await promise

    if (uploadFile.fulfilled.match(result)) {
      expectTypeOf(result.payload).toBeString()
    }
  })

  test('without a `ProgressEvent` type parameter, `onProgress` accepts `unknown`', () => {
    const thunk = createAsyncThunkWithProgress(
      'test',
      async (_arg: void, _thunkAPI, onProgress) => {
        expectTypeOf(onProgress).toEqualTypeOf<
          (progressEvent: unknown) => void
        >()

        onProgress({ anything: 'goes' })

        return 42
      },
    )

    expectTypeOf(thunk.progress).toEqualTypeOf<
      AsyncThunkProgressActionCreator<void, unknown>
    >()
  })

  test("works within `createSlice`'s `extraReducers` builder callback", () => {
    const uploadFile = createAsyncThunkWithProgress<
      string,
      void,
      {},
      { progress: number }
    >('files/upload', async (_arg, _thunkAPI, onProgress) => {
      onProgress({ progress: 1 })
      return 'done'
    })

    const slice = createSlice({
      name: 'files',
      initialState: { progress: 0, url: null as string | null },
      reducers: {},
      extraReducers: (builder) => {
        builder
          .addCase(uploadFile.progress, (state, action) => {
            state.progress = action.payload.progress
          })
          .addCase(uploadFile.fulfilled, (state, action) => {
            state.url = action.payload
          })
      },
    })

    expectTypeOf(slice.reducer).toBeFunction()
  })
})
