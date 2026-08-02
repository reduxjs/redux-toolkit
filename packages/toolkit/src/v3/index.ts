import { buildCreateReducer } from './createReducer'
import type { CreateReducer } from './createReducer'
import { buildCreateSlice } from './createSlice'
import type { CreateSlice } from './createSlice'
import { immerAdapter } from './immerAdapter'

/**
 * The default `createSlice`, bound to the Immer adapter. The `@__PURE__`
 * annotation lets bundlers drop this binding (and Immer with it) when an
 * app only uses `buildCreateSlice` with a different adapter.
 */
export const createSlice: CreateSlice = /* @__PURE__ */ buildCreateSlice({
  immutability: immerAdapter,
})

/**
 * The default `createReducer`, bound to the Immer adapter, same pattern
 * as `createSlice` above. An optional per-call adapter argument overrides
 * the default.
 */
export const createReducer: CreateReducer = /* @__PURE__ */ buildCreateReducer(
  {
    immutability: immerAdapter,
  },
)

export { buildCreateSlice } from './createSlice'
export { immerAdapter } from './immerAdapter'
export { noopAdapter } from './immutability'
export type {
  Draft,
  ImmutabilityAdapter,
  WritableDraft,
} from './immutability'
export { buildCreateReducer } from './createReducer'
export type {
  ActionReducerMapBuilder,
  AsyncThunkReducers,
  BuildCreateReducerConfig,
  CaseReducer,
  CreateReducer,
  ReducerWithInitialState,
  TypedActionCreator,
} from './createReducer'
export type {
  BuildCreateSliceConfig,
  CreateSlice,
  CaseReducerWithPrepare,
  CreateSliceCallbackOptions,
  CreateSliceObjectOptions,
  CreatorsMap,
  DefinitionsShape,
  DefinitionSliceActions,
  DefinitionSliceCaseReducers,
  InjectedSlice,
  Injectable,
  InjectIntoConfig,
  ObjectSliceActions,
  ObjectSliceCaseReducers,
  Slice,
  SliceCaseReducers,
  SliceSelectors,
  WrappedSliceSelectors,
} from './createSlice'

export { combineSlices } from './combineSlices'
export type {
  CombinedSliceReducer,
  InjectConfig,
  SliceLike,
  WithSlice,
} from './combineSlices'

export {
  asyncThunkCreator,
  buildBuiltinCreators,
  isReducerDefinition,
  makeDefinition,
  resetCreator,
} from './creators'
export type {
  AnyExposure,
  AsyncThunkCreatorConfig,
  BoundAsyncThunkCreator,
  BuiltinSliceCreators,
  CreatorContext,
  PreparedActionExposure,
  ReducerDefinition,
  ReducerDetails,
  ReducerHandlingContext,
  SliceActionExposure,
  ValueExposure,
} from './creators'
