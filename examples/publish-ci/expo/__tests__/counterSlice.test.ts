import type { CounterState } from '../src/features/counter/counterSlice';
import {
  counterSlice,
  decrement,
  increment,
  incrementByAmount,
} from '../src/features/counter/counterSlice';

describe('counter reducer', () => {
  const { reducer: counterReducer } = counterSlice;
  const initialState: CounterState = {
    value: 3,
    status: 'idle',
  };

  test('should handle initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toStrictEqual({
      value: 0,
      status: 'idle',
    });
  });

  test('should handle increment', () => {
    const actual = counterReducer(initialState, increment());
    expect(actual.value).toBe(4);
  });

  test('should handle decrement', () => {
    const actual = counterReducer(initialState, decrement());
    expect(actual.value).toBe(2);
  });

  test('should handle incrementByAmount', () => {
    const actual = counterReducer(initialState, incrementByAmount(2));
    expect(actual.value).toBe(5);
  });
});
