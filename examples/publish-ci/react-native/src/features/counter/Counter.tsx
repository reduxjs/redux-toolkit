import { useState } from "react"
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { AsyncButton } from "../../components/AsyncButton"
import { TypedColors } from "../../constants/TypedColors"
import {
  decrement,
  increment,
  incrementAsync,
  incrementByAmount,
  incrementIfOdd,
  selectCount,
  selectStatus,
} from "./counterSlice"

export const Counter = () => {
  const isDarkMode = useColorScheme() === "dark"
  const textStyle = {
    color: isDarkMode ? TypedColors.light : TypedColors.dark,
  }

  const dispatch = useAppDispatch()
  const count = useAppSelector(selectCount)
  const status = useAppSelector(selectStatus)
  const [incrementAmount, setIncrementAmount] = useState("2")

  const incrementValue = Number(incrementAmount) || 0

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          aria-label="Decrement value"
          onPress={() => dispatch(decrement())}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <Text aria-label="Count" style={[styles.value, textStyle]}>
          {count}
        </Text>
        <TouchableOpacity
          style={styles.button}
          aria-label="Increment value"
          onPress={() => dispatch(increment())}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextInput
          aria-label="Set increment amount"
          style={[styles.textbox, textStyle]}
          value={`${incrementAmount}`}
          keyboardType="numeric"
          onChangeText={setIncrementAmount}
        />
        <View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => dispatch(incrementByAmount(incrementValue))}
          >
            <Text style={styles.buttonText}>Add Amount</Text>
          </TouchableOpacity>
          <AsyncButton
            aria-label="Async Button"
            style={styles.button}
            disabled={status !== "idle"}
            onPress={() => {
              dispatch(incrementAsync(incrementValue))
            }}
          >
            <Text style={styles.buttonText}>Add Async</Text>
          </AsyncButton>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              dispatch(incrementIfOdd(incrementValue))
            }}
          >
            <Text style={styles.buttonText}>Add If Odd</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  value: {
    fontSize: 78,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  button: {
    backgroundColor: "rgba(112, 76, 182, 0.1)",
    borderRadius: 2,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 4,
    margin: 2,
  },
  buttonText: {
    color: "rgb(112, 76, 182)",
    fontSize: 32,
    textAlign: "center",
  },
  textbox: {
    fontSize: 48,
    padding: 2,
    width: 64,
    textAlign: "center",
    marginRight: 8,
    borderWidth: 1,
    justifyContent: "center",
  },
})
