import type { ActionCreatorWithPreparedPayload } from './createAction'
import { createAction } from './createAction'
import type {
  AsyncThunk,
  AsyncThunkConfig,
  AsyncThunkOptions,
  AsyncThunkPayloadCreator,
  AsyncThunkPayloadCreatorReturnValue,
  GetThunkAPI,
} from './createAsyncThunk'
import { createAsyncThunk } from './createAsyncThunk'

/**
 * A type describing the `payloadCreator` argument to `createAsyncThunkWithProgress`.
 * Identical to `AsyncThunkPayloadCreator`, but the payload creator additionally
 * receives an `onProgress` callback that can be called (repeatedly) to report
 * progress on the running request.
 *
 * @public
 */
export type AsyncThunkPayloadCreatorWithProgress<
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends AsyncThunkConfig = {},
  ProgressEvent = unknown,
> = (
  arg: ThunkArg,
  thunkAPI: GetThunkAPI<ThunkApiConfig>,
  onProgress: (progressEvent: ProgressEvent) => void,
) => AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig>

/**
 * The action creator that is dispatched every time `onProgress` is called by
 * the payload creator of a thunk created with `createAsyncThunkWithProgress`.
 *
 * @public
 */
export type AsyncThunkProgressActionCreator<ThunkArg, ProgressEvent> =
  ActionCreatorWithPreparedPayload<
    [payload: ProgressEvent, requestId: string, arg: ThunkArg, meta?: object],
    ProgressEvent,
    string,
    never,
    {
      arg: ThunkArg
      requestId: string
      requestStatus: 'pending'
    }
  >

/**
 * A type describing the return value of `createAsyncThunkWithProgress`.
 *
 * @public
 */
export type AsyncThunkWithProgress<
  Returned,
  ThunkArg,
  ThunkApiConfig extends AsyncThunkConfig,
  ProgressEvent,
> = AsyncThunk<Returned, ThunkArg, ThunkApiConfig> & {
  progress: AsyncThunkProgressActionCreator<ThunkArg, ProgressEvent>
}

/**
 * A wrapper around `createAsyncThunk` that additionally exposes a `progress`
 * action, and passes the payload creator an `onProgress` callback which,
 * when called, dispatches that `progress` action.
 *
 * This is useful for long-running async operations that can report
 * incremental progress, such as file uploads or downloads - for example
 * when driven by `axios`'s `onUploadProgress`/`onDownloadProgress` options,
 * or the Fetch API's `ReadableStream`.
 *
 * The shape of the progress payload is not prescribed - pass whatever type
 * fits your use case as the `ProgressEvent` type parameter.
 *
 * ```ts
 * const uploadFile = createAsyncThunkWithProgress<Result, FormData, {}, AxiosProgressEvent>(
 *   'file/upload',
 *   async (formData, thunkAPI, onProgress) => {
 *     const response = await axios.post('/upload', formData, {
 *       onUploadProgress: onProgress,
 *       signal: thunkAPI.signal,
 *     })
 *     return response.data
 *   },
 * )
 *
 * // in a reducer:
 * builder.addCase(uploadFile.progress, (state, action) => {
 *   state.progress = action.payload
 * })
 * ```
 *
 * @public
 */
export function createAsyncThunkWithProgress<
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends AsyncThunkConfig = {},
  ProgressEvent = unknown,
>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreatorWithProgress<
    Returned,
    ThunkArg,
    ThunkApiConfig,
    ProgressEvent
  >,
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>,
): AsyncThunkWithProgress<Returned, ThunkArg, ThunkApiConfig, ProgressEvent> {
  const progress: AsyncThunkProgressActionCreator<ThunkArg, ProgressEvent> =
    createAction(
      typePrefix + '/progress',
      (
        payload: ProgressEvent,
        requestId: string,
        arg: ThunkArg,
        meta?: object,
      ) => ({
        payload,
        meta: {
          ...((meta as object) || {}),
          arg,
          requestId,
          requestStatus: 'pending' as const,
        },
      }),
    )

  // `thunkAPI` is deliberately typed against the unresolved `AsyncThunkConfig`
  // base (rather than the generic `ThunkApiConfig` type parameter) so that
  // TypeScript can eagerly resolve `dispatch` here - it can't do so for a
  // still-generic `ThunkApiConfig`. The whole function is cast back to the
  // properly-typed `AsyncThunkPayloadCreator` below.
  const wrappedPayloadCreator = (
    arg: ThunkArg,
    thunkAPI: GetThunkAPI<AsyncThunkConfig>,
  ): AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig> => {
    const onProgress = (progressEvent: ProgressEvent): void => {
      thunkAPI.dispatch(progress(progressEvent, thunkAPI.requestId, arg))
    }

    return payloadCreator(
      arg,
      thunkAPI as GetThunkAPI<ThunkApiConfig>,
      onProgress,
    )
  }

  const asyncThunk = createAsyncThunk<Returned, ThunkArg, ThunkApiConfig>(
    typePrefix,
    wrappedPayloadCreator as AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      ThunkApiConfig
    >,
    options,
  ) as AsyncThunkWithProgress<Returned, ThunkArg, ThunkApiConfig, ProgressEvent>

  asyncThunk.progress = progress

  return asyncThunk
}
