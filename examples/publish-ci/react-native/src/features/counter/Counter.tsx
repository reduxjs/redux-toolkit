import type { FC } from 'react';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { AsyncButton } from '../../components/AsyncButton';
import {
  decrement,
  increment,
  incrementAsync,
  incrementByAmount,
  incrementIfOdd,
  selectCount,
} from './counterSlice';

export const Counter: FC = () => {
  const [incrementAmount, setIncrementAmount] = useState('2');
  const count = useAppSelector(selectCount);
  const status = useAppSelector(state => state.counter.status);
  const dispatch = useAppDispatch();

  const incrementValue = Number(incrementAmount) || 0;

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => dispatch(increment())}>
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{count}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => dispatch(decrement())}>
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextInput
          style={styles.textbox}
          value={incrementAmount}
          keyboardType="numeric"
          onChangeText={setIncrementAmount}
        />
        <View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => dispatch(incrementByAmount(incrementValue))}>
            <Text style={styles.buttonText}>Add Amount</Text>
          </TouchableOpacity>
          <AsyncButton
            style={styles.button}
            disabled={status !== 'idle'}
            onPress={() => {
              dispatch(incrementAsync(incrementValue)).catch(console.log);
            }}>
            <Text style={styles.buttonText}>Add Async</Text>
          </AsyncButton>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              dispatch(incrementIfOdd(incrementValue));
            }}>
            <Text style={styles.buttonText}>Add If Odd</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  value: {
    fontSize: 78,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  button: {
    backgroundColor: 'rgba(112, 76, 182, 0.1)',
    borderRadius: 2,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 4,
    margin: 2,
  },
  buttonText: {
    color: 'rgb(112, 76, 182)',
    fontSize: 32,
    textAlign: 'center',
  },
  textbox: {
    fontSize: 48,
    padding: 2,
    width: 64,
    textAlign: 'center',
    marginRight: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
