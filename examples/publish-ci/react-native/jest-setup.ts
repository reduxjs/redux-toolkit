import '@testing-library/react-native'
import { installQuotesFetchMock } from './src/mocks/quotesFetchMock'

beforeEach(() => {
  installQuotesFetchMock()
})
