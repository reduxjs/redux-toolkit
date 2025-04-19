import type { Action } from '@reduxjs/toolkit'
import { configureStore } from '@reduxjs/toolkit'
import { act, screen } from '@testing-library/react-native'
import type { Dispatch, PropsWithChildren } from 'react'
import { Component, PureComponent } from 'react'
import type { TextStyle } from 'react-native'
import { Button, Text, View } from 'react-native'
import { connect, Provider } from 'react-redux'
import { App } from './App'
import { renderWithProviders } from './src/utils/test-utils'

test('App should have correct initial render', () => {
  renderWithProviders(<App />)

  const countLabel = screen.getByLabelText('Count')

  const incrementValueInput = screen.getByLabelText('Set increment amount')

  // The app should be rendered correctly
  expect(screen.getByText(/learn more redux/i)).toBeOnTheScreen()

  // Initial state: count should be 0, incrementValue should be 2
  expect(countLabel).toHaveTextContent('0')
  expect(incrementValueInput).toHaveDisplayValue('2')
})

test('Increment value and Decrement value should work as expected', async () => {
  const { user } = renderWithProviders(<App />)

  const countLabel = screen.getByLabelText('Count')

  const incrementValueButton = screen.getByLabelText('Increment value')

  const decrementValueButton = screen.getByLabelText('Decrement value')

  // Click on "+" => Count should be 1
  await user.press(incrementValueButton)
  expect(countLabel).toHaveTextContent('1')

  // Click on "-" => Count should be 0
  await user.press(decrementValueButton)
  expect(countLabel).toHaveTextContent('0')
})

test('Add Amount should work as expected', async () => {
  const { user } = renderWithProviders(<App />)

  const countLabel = screen.getByLabelText('Count')

  const incrementValueInput = screen.getByLabelText('Set increment amount')

  const addAmountButton = screen.getByText('Add Amount')

  // "Add Amount" button is clicked => Count should be 2
  await user.press(addAmountButton)
  expect(countLabel).toHaveTextContent('2')

  // incrementValue is 2, click on "Add Amount" => Count should be 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, '2')
  await user.press(addAmountButton)
  expect(countLabel).toHaveTextContent('4')

  // [Negative number] incrementValue is -1, click on "Add Amount" => Count should be 3
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, '-1')
  await user.press(addAmountButton)
  expect(countLabel).toHaveTextContent('3')
})

it('Add Async should work as expected', async () => {
  const { user } = renderWithProviders(<App />)

  const addAsyncButton = screen.getByText('Add Async')

  const countLabel = screen.getByLabelText('Count')

  const incrementValueInput = screen.getByLabelText('Set increment amount')

  // "Add Async" button is clicked => Count should be 2
  await user.press(addAsyncButton)

  await act(async () => {
    await jest.advanceTimersByTimeAsync(500)
  })

  expect(countLabel).toHaveTextContent('2')

  // incrementValue is 2, click on "Add Async" => Count should be 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, '2')

  await user.press(addAsyncButton)

  await act(async () => {
    await jest.advanceTimersByTimeAsync(500)
  })

  expect(countLabel).toHaveTextContent('4')

  // [Negative number] incrementValue is -1, click on "Add Async" => Count should be 3
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, '-1')
  await user.press(addAsyncButton)

  await act(async () => {
    await jest.advanceTimersByTimeAsync(500)
  })

  expect(countLabel).toHaveTextContent('3')
})

test('Add If Odd should work as expected', async () => {
  const { user } = renderWithProviders(<App />)

  const countLabel = screen.getByLabelText('Count')

  const addIfOddButton = screen.getByText('Add If Odd')

  const incrementValueInput = screen.getByLabelText('Set increment amount')

  const incrementValueButton = screen.getByLabelText('Increment value')

  // "Add If Odd" button is clicked => Count should stay 0
  await user.press(addIfOddButton)
  expect(countLabel).toHaveTextContent('0')

  // Click on "+" => Count should be updated to 1
  await user.press(incrementValueButton)
  expect(countLabel).toHaveTextContent('1')

  // "Add If Odd" button is clicked => Count should be updated to 3
  await user.press(addIfOddButton)
  expect(countLabel).toHaveTextContent('3')

  // incrementValue is 1, click on "Add If Odd" => Count should be updated to 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, '1')
  await user.press(addIfOddButton)
  expect(countLabel).toHaveTextContent('4')

  // click on "Add If Odd" => Count should stay 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, '-1')
  await user.press(addIfOddButton)
  expect(countLabel).toHaveTextContent('4')
})

test('React-Redux issue #2150: Nested component updates should be properly batched when using connect', async () => {
  // Original Issue: https://github.com/reduxjs/react-redux/issues/2150
  // Solution: https://github.com/reduxjs/react-redux/pull/2156

  // Actions
  const ADD = 'ADD'
  const DATE = 'DATE'

  // Action types
  type AddAction = {} & Action
  type DateAction = {
    payload?: { date: number }
  } & Action

  // Reducer states
  type DateState = {
    date: number | null
  }

  type CounterState = {
    count: number
  }

  // Reducers
  const dateReducer = (
    state: DateState = { date: null },
    action: DateAction,
  ) => {
    switch (action.type) {
      case DATE:
        return {
          ...state,
          date: action.payload?.date ?? null,
        }
      default:
        return state
    }
  }

  const counterReducer = (
    state: CounterState = { count: 0 },
    action: AddAction,
  ) => {
    switch (action.type) {
      case ADD:
        return {
          ...state,
          count: state.count + 1,
        }
      default:
        return state
    }
  }

  // Store
  const store = configureStore({
    reducer: {
      counter: counterReducer,
      dates: dateReducer,
    },
  })

  // ======== COMPONENTS =========
  type CounterProps = {
    count?: number
    date?: number | null
    dispatch: Dispatch<AddAction | DateAction>
    testID?: string
  }

  class CounterRaw extends PureComponent<CounterProps> {
    handleIncrement = () => {
      this.props.dispatch({ type: ADD })
    }

    handleDate = () => {
      this.props.dispatch({ type: DATE, payload: { date: Date.now() } })
    }

    render() {
      return (
        <View style={{ paddingVertical: 20 }}>
          <Text testID={`${this.props.testID ?? ''}-child`}>
            Counter Value: {this.props.count}
          </Text>
          <Text>date Value: {this.props.date}</Text>
        </View>
      )
    }
  }

  class ButtonsRaw extends PureComponent<CounterProps> {
    handleIncrement = () => {
      this.props.dispatch({ type: ADD })
    }

    handleDate = () => {
      this.props.dispatch({ type: DATE, payload: { date: Date.now() } })
    }

    render() {
      return (
        <View>
          <Button title="Update Date" onPress={this.handleDate} />
          <View style={{ height: 20 }} />
          <Button title="Increment Counter" onPress={this.handleIncrement} />
        </View>
      )
    }
  }

  const mapStateToProps = (state: {
    counter: CounterState
    dates: DateState
  }) => {
    return { count: state.counter.count, date: state.dates.date }
  }

  const mapDispatchToProps = (dispatch: Dispatch<AddAction | DateAction>) => ({
    dispatch,
  })

  const Buttons = connect(null, mapDispatchToProps)(ButtonsRaw)
  const Counter = connect(mapStateToProps, mapDispatchToProps)(CounterRaw)

  class Container extends PureComponent<PropsWithChildren> {
    render() {
      return this.props.children
    }
  }

  const mapStateToPropsBreaking = (_state: unknown) => ({})

  const ContainerBad = connect(mapStateToPropsBreaking, null)(Container)

  const mapStateToPropsNonBlocking1 = (state: { counter: CounterState }) => ({
    count: state.counter.count,
  })

  const ContainerNonBlocking1 = connect(
    mapStateToPropsNonBlocking1,
    null,
  )(Container)

  const mapStateToPropsNonBlocking2 = (state: unknown) => ({ state })

  const ContainerNonBlocking2 = connect(
    mapStateToPropsNonBlocking2,
    null,
  )(Container)

  class MainApp extends Component {
    render() {
      const $H1: TextStyle = { fontSize: 20 }
      return (
        <Provider store={store}>
          <Buttons />
          <Text style={$H1}>=Expected=</Text>
          <View>
            <Text>
              I don't have a parent blocking state updates so I should behave as
              expected
            </Text>
            <Counter />
          </View>

          <Text style={$H1}>=Undesired behavior with react-redux 9.x=</Text>
          <ContainerBad>
            <Text>All redux state updates blocked</Text>
            <Counter testID="undesired" />
          </ContainerBad>

          <Text style={$H1}>=Partially working in 9.x=</Text>
          <ContainerNonBlocking1>
            <Text>
              I'm inconsistent, if date updates first I don't see it, but once
              count updates I rerender with count or date changes
            </Text>
            <Counter testID="inconsistent" />
          </ContainerNonBlocking1>

          <Text style={$H1}>=Poor workaround for 9.x?=</Text>
          <ContainerNonBlocking2>
            <Text>I see all state changes</Text>
            <Counter />
          </ContainerNonBlocking2>
        </Provider>
      )
    }
  }

  const { user, getByTestId, getByText } = renderWithProviders(<MainApp />)

  expect(getByTestId('undesired-child')).toHaveTextContent('Counter Value: 0')

  await user.press(getByText('Increment Counter'))

  expect(getByTestId('inconsistent-child')).toHaveTextContent(
    'Counter Value: 1',
  )

  expect(getByTestId('undesired-child')).toHaveTextContent('Counter Value: 1')
})
