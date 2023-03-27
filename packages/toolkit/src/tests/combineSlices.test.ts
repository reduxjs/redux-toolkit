import { createReducer } from '../createReducer'
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
  describe('injectSlices', () => {
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
  })
  describe('selector', () => {
    const combinedReducer =
      combineSlices(stringSlice).withLazyLoadedSlices<{ boolean: boolean }>()

    const uninjectedState = combinedReducer(undefined, dummyAction())

    const injectedReducer = combinedReducer.injectSlices({
      boolean: booleanReducer,
    })

    it('ensures state is defined in selector even if action has not been dispatched', () => {
      expect(uninjectedState.boolean).toBe(undefined)

      const selectBoolean = injectedReducer.selector((state) => state.boolean)

      expect(selectBoolean(uninjectedState)).toBe(
        booleanReducer.getInitialState()
      )
    })
    it('exposes original to allow for logging', () => {
      const selectBoolean = injectedReducer.selector((state) => {
        return injectedReducer.selector.original(state).boolean
      })
      expect(selectBoolean(uninjectedState)).toBe(undefined)
    })
    it('throws if original is called on something other than state proxy', () => {
      expect(() => injectedReducer.selector.original({} as any)).toThrow(
        'original must be used on state Proxy'
      )
    })
  })
})
