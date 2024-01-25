import { useState } from "react"
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native"
import { TypedColors } from "../../constants/TypedColors"
import { useGetQuotesQuery } from "./quotesApiSlice"

const options = [5, 10, 20, 30]

export const Quotes = () => {
  const isDarkMode = useColorScheme() === "dark"
  const textStyle = {
    color: isDarkMode ? TypedColors.light : TypedColors.dark,
  }
  const backgroundStyle = {
    backgroundColor: isDarkMode ? TypedColors.darker : TypedColors.lighter,
  }

  const [numberOfQuotes, setNumberOfQuotes] = useState(10)
  const [modalVisible, setModalVisible] = useState(false)
  // Using a query hook automatically fetches data and returns query values
  const { data, isError, isLoading, isSuccess } =
    useGetQuotesQuery(numberOfQuotes)

  if (isError) {
    return <Text>There was an error!!!</Text>
  }

  if (isLoading) {
    return <Text>Loading...</Text>
  }

  const pickNumberOfQuotes = (value: number) => {
    setNumberOfQuotes(value)
    setModalVisible(false)
  }

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => {
            setModalVisible(true)
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            Select the Quantity of Quotes to Fetch: {numberOfQuotes}
          </Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          style={backgroundStyle}
          onRequestClose={() => {
            setModalVisible(false)
          }}
        >
          <View style={[styles.modalView, backgroundStyle]}>
            <ScrollView style={styles.quotesList}>
              {options.map(option => (
                <TouchableOpacity
                  key={option}
                  style={styles.option}
                  onPress={() => {
                    pickNumberOfQuotes(option)
                  }}
                >
                  <Text style={[styles.optionText, textStyle]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {
          <ScrollView>
            {data.quotes.map(({ author, quote, id }) => (
              <View key={id} style={[styles.quoteContainer, backgroundStyle]}>
                <Text
                  style={[styles.quoteText, textStyle]}
                >{`"${quote}"`}</Text>
                <Text style={[styles.author, textStyle]}>- {author}</Text>
              </View>
            ))}
          </ScrollView>
        }
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  button: {
    padding: 10,
    backgroundColor: "rgba(112, 76, 182, 0.1)",
    borderRadius: 5,
  },
  buttonText: {
    color: "rgb(112, 76, 182)",
    fontSize: 18,
    textAlign: "center",
    margin: 5,
  },
  modalView: {
    margin: 20,
    borderRadius: 5,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  option: {
    fontSize: 30,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
  },
  optionText: {
    fontSize: 20,
  },
  quotesList: {
    width: "auto",
  },
  quoteContainer: {
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  quoteText: {
    fontStyle: "italic",
  },
  author: {
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 5,
  },
})
