import { createReducer } from '../createReducer'
import type { PayloadAction } from '../createAction'
import { createAction } from '../createAction'
import { createSlice } from '../createSlice'
import type { WithSlice } from '../combineSlices'
import { combineSlices } from '../combineSlices'

const dummyAction = createAction<void>('dummy')

const stringSlice = createSlice({
  name: 'string',
  initialState: '',
  reducers: {},
})

const numberSlice = createSlice({
  name: 'number',
  initialState: 0,
  reducers: {},
})

const booleanReducer = createReducer(false, () => {})

describe('combineSlices', () => {
  it('calls combineReducers to combine static slices/reducers', () => {
    const combinedReducer = combineSlices(stringSlice, {
      num: numberSlice.reducer,
      boolean: booleanReducer,
    })
    expect(combinedReducer(undefined, dummyAction())).toEqual({
      string: stringSlice.getInitialState(),
      num: numberSlice.getInitialState(),
      boolean: booleanReducer.getInitialState(),
    })
  })
  it('injects slice', () => {
    const combinedReducer =
      combineSlices(stringSlice).withLazyLoadedSlices<
        WithSlice<typeof numberSlice>
      >()

    expect(combinedReducer(undefined, dummyAction()).number).toBe(undefined)

    const injectedReducer = combinedReducer.injectSlices(numberSlice)

    expect(injectedReducer(undefined, dummyAction()).number).toBe(
      numberSlice.getInitialState()
    )
  })
  it('throws error when same name is used for different reducers', () => {
    const combinedReducer =
      combineSlices(stringSlice).withLazyLoadedSlices<{ boolean: boolean }>()

    combinedReducer.injectSlices({ boolean: booleanReducer })

    expect(() =>
      combinedReducer.injectSlices({ boolean: booleanReducer })
    ).not.toThrow()

    expect(() =>
      // @ts-expect-error wrong reducer
      combinedReducer.injectSlices({ boolean: stringSlice.reducer })
    ).toThrow(
      "Name 'boolean' has already been injected with different reducer instance"
    )
  })
  it.skip('ensures state is defined in selector even if action has not been dispatched', () => {
    const combinedReducer =
      combineSlices(stringSlice).withLazyLoadedSlices<{ boolean: boolean }>()

    const uninjectedState = combinedReducer(undefined, dummyAction())

    expect(uninjectedState.boolean).toBe(undefined)

    const selector = combinedReducer
      .injectSlices({
        boolean: booleanReducer,
      })
      .selector((state) => state.boolean)

    expect(selector(uninjectedState)).toBe(booleanReducer.getInitialState())
  })
})
