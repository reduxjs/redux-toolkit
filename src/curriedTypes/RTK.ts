export interface CurryableTypes {
  createAsyncThunk: typeof createAsyncThunk
  createThunk: typeof createThunk
}

export interface CurriedType<RootState, Dispatch> {
  createAsyncThunk: CurriedCreateAsyncThunk<RootState, Dispatch>
  createThunk: CurriedCreateThunk<RootState, Dispatch>
}

/* eslint-disable import/first */
import {
  createAsyncThunk,
  AsyncThunk,
  AsyncThunkPayloadCreator,
  AsyncThunkConfig,
  AsyncThunkOptions
} from '../createAsyncThunk'
import { ThunkDispatch } from 'redux-thunk'
import { createThunk, ThunkActionCreator } from '../createThunk'

export type ExtraFromDispatch<Dispatch> = Dispatch extends ThunkDispatch<
  any,
  infer Extra,
  any
>
  ? Extra
  : unknown

type CurriedCreateAsyncThunk<RootState, Dispatch> = <
  Returned,
  ThunkArg = void,
  ThunkApiConfig extends Omit<
    AsyncThunkConfig,
    'dispatch' | 'state' | 'extra'
  > = {}
>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<
    Returned,
    ThunkArg,
    ThunkApiConfig & {
      dispatch: Dispatch
      state: RootState
      extra: ExtraFromDispatch<Dispatch>
    }
  >,
  options?: AsyncThunkOptions<ThunkArg, ThunkApiConfig>
) => AsyncThunk<Returned, ThunkArg, ThunkApiConfig>

type CurriedCreateThunk<RootState, Dispatch> = <Args extends any[], R>(
  thunkActionCreator: ThunkActionCreator<
    Args,
    R,
    RootState,
    ExtraFromDispatch<Dispatch>,
    Dispatch
  >
) => ThunkActionCreator<
  Args,
  R,
  RootState,
  ExtraFromDispatch<Dispatch>,
  Dispatch
>
