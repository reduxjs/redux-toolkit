import { screen, waitFor } from "@testing-library/react"
import App from "./App"
import { renderWithProviders } from "./utils/test-utils"

test("App should have correct initial render", () => {
  renderWithProviders(<App />)

  // The app should be rendered correctly
  expect(screen.getByText(/learn/i)).toBeInTheDocument()

  // Initial state: count should be 0, incrementValue should be 2
  expect(screen.getByLabelText("Count")).toHaveTextContent("0")
  expect(screen.getByLabelText("Set increment amount")).toHaveValue(2)
})

test("Increment value and Decrement value should work as expected", async () => {
  const { user } = renderWithProviders(<App />)

  // Click on "+" => Count should be 1
  await user.click(screen.getByLabelText("Increment value"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("1")

  // Click on "-" => Count should be 0
  await user.click(screen.getByLabelText("Decrement value"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("0")
})

test("Add Amount should work as expected", async () => {
  const { user } = renderWithProviders(<App />)

  // "Add Amount" button is clicked => Count should be 2
  await user.click(screen.getByText("Add Amount"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("2")

  const incrementValueInput = screen.getByLabelText("Set increment amount")
  // incrementValue is 2, click on "Add Amount" => Count should be 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, "2")
  await user.click(screen.getByText("Add Amount"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("4")

  // [Negative number] incrementValue is -1, click on "Add Amount" => Count should be 3
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, "-1")
  await user.click(screen.getByText("Add Amount"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("3")
})

it("Add Async should work as expected", async () => {
  const { user } = renderWithProviders(<App />)

  // "Add Async" button is clicked => Count should be 2
  await user.click(screen.getByText("Add Async"))

  await waitFor(() =>
    expect(screen.getByLabelText("Count")).toHaveTextContent("2"),
  )

  const incrementValueInput = screen.getByLabelText("Set increment amount")
  // incrementValue is 2, click on "Add Async" => Count should be 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, "2")

  await user.click(screen.getByText("Add Async"))
  await waitFor(() =>
    expect(screen.getByLabelText("Count")).toHaveTextContent("4"),
  )

  // [Negative number] incrementValue is -1, click on "Add Async" => Count should be 3
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, "-1")
  await user.click(screen.getByText("Add Async"))
  await waitFor(() =>
    expect(screen.getByLabelText("Count")).toHaveTextContent("3"),
  )
})

test("Add If Odd should work as expected", async () => {
  const { user } = renderWithProviders(<App />)

  // "Add If Odd" button is clicked => Count should stay 0
  await user.click(screen.getByText("Add If Odd"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("0")

  // Click on "+" => Count should be updated to 1
  await user.click(screen.getByLabelText("Increment value"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("1")

  // "Add If Odd" button is clicked => Count should be updated to 3
  await user.click(screen.getByText("Add If Odd"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("3")

  const incrementValueInput = screen.getByLabelText("Set increment amount")
  // incrementValue is 1, click on "Add If Odd" => Count should be updated to 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, "1")
  await user.click(screen.getByText("Add If Odd"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("4")

  // click on "Add If Odd" => Count should stay 4
  await user.clear(incrementValueInput)
  await user.type(incrementValueInput, "-1")
  await user.click(screen.getByText("Add If Odd"))
  expect(screen.getByLabelText("Count")).toHaveTextContent("4")
})
