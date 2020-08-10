export interface CurryableTypes {
  createAsyncThunk: typeof createAsyncThunk
}

export interface CurriedType<RootState, Dispatch> {
  createAsyncThunk: CurriedCreateAsyncThunk<RootState, Dispatch>
}

/* eslint-disable import/first */
import {
  createAsyncThunk,
  AsyncThunk,
  AsyncThunkPayloadCreator,
  AsyncThunkConfig,
  AsyncThunkOptions
} from '../createAsyncThunk'

type CurriedCreateAsyncThunk<RootState, Dispatch> = <
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends Omit<AsyncThunkConfig, 'dispatch' | 'state'> = {}
>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<
    Returned,
    ThunkArg,
    ThunkApiConfig & { dispatch: Dispatch; state: RootState }
  >,
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
) => AsyncThunk<Returned, ThunkArg, ThunkApiConfig>
