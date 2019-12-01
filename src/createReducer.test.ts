import { createReducer, CaseReducer } from './createReducer'
import { PayloadAction, createAction } from './createAction'
import { Reducer } from 'redux'

interface Todo {
  text: string
  completed?: boolean
}

interface AddTodoPayload {
  newTodo: Todo
}

interface ToggleTodoPayload {
  index: number
}

type TodoState = Todo[]
type TodosReducer = Reducer<TodoState, PayloadAction<any>>
type AddTodoReducer = CaseReducer<TodoState, PayloadAction<AddTodoPayload>>

type ToggleTodoReducer = CaseReducer<
  TodoState,
  PayloadAction<ToggleTodoPayload>
>

describe('createReducer', () => {
  describe('given impure reducers with immer', () => {
    const addTodo: AddTodoReducer = (state, action) => {
      const { newTodo } = action.payload

      // Can safely call state.push() here
      state.push({ ...newTodo, completed: false })
    }

    const toggleTodo: ToggleTodoReducer = (state, action) => {
      const { index } = action.payload

      const todo = state[index]
      // Can directly modify the todo object
      todo.completed = !todo.completed
    }

    const todosReducer = createReducer([] as TodoState, {
      ADD_TODO: addTodo,
      TOGGLE_TODO: toggleTodo
    })

    behavesLikeReducer(todosReducer)
  })

  describe('given pure reducers with immutable updates', () => {
    const addTodo: AddTodoReducer = (state, action) => {
      const { newTodo } = action.payload

      // Updates the state immutably without relying on immer
      return state.concat({ ...newTodo, completed: false })
    }

    const toggleTodo: ToggleTodoReducer = (state, action) => {
      const { index } = action.payload

      // Updates the todo object immutably withot relying on immer
      return state.map((todo, i) => {
        if (i !== index) return todo
        return { ...todo, completed: !todo.completed }
      })
    }

    const todosReducer = createReducer([] as TodoState, {
      ADD_TODO: addTodo,
      TOGGLE_TODO: toggleTodo
    })

    behavesLikeReducer(todosReducer)
  })

  describe('alternative builder callback for actionMap', () => {
    const increment = createAction<number, 'increment'>('increment')
    const decrement = createAction<number, 'decrement'>('decrement')

    test('can be used with ActionCreators', () => {
      const reducer = createReducer(0, builder =>
        builder
          .addCase(increment, (state, action) => state + action.payload)
          .addCase(decrement, (state, action) => state - action.payload)
      )
      expect(reducer(0, increment(5))).toBe(5)
      expect(reducer(5, decrement(5))).toBe(0)
    })
    test('can be used with string types', () => {
      const reducer = createReducer(0, builder =>
        builder
          .addCase(
            'increment',
            (state, action: { type: 'increment'; payload: number }) =>
              state + action.payload
          )
          .addCase(
            'decrement',
            (state, action: { type: 'decrement'; payload: number }) =>
              state - action.payload
          )
      )
      expect(reducer(0, increment(5))).toBe(5)
      expect(reducer(5, decrement(5))).toBe(0)
    })
    test('can be used with ActionCreators and string types combined', () => {
      const reducer = createReducer(0, builder =>
        builder
          .addCase(increment, (state, action) => state + action.payload)
          .addCase(
            'decrement',
            (state, action: { type: 'decrement'; payload: number }) =>
              state - action.payload
          )
      )
      expect(reducer(0, increment(5))).toBe(5)
      expect(reducer(5, decrement(5))).toBe(0)
    })
    test('will throw if the same type is used twice', () => {
      expect(() =>
        createReducer(0, builder =>
          builder
            .addCase(increment, (state, action) => state + action.payload)
            .addCase(increment, (state, action) => state + action.payload)
            .addCase(decrement, (state, action) => state - action.payload)
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"addCase cannot be called with two reducers for the same action type"`
      )
      expect(() =>
        createReducer(0, builder =>
          builder
            .addCase(increment, (state, action) => state + action.payload)
            .addCase('increment', state => state + 1)
            .addCase(decrement, (state, action) => state - action.payload)
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"addCase cannot be called with two reducers for the same action type"`
      )
    })
  })
})

function behavesLikeReducer(todosReducer: TodosReducer) {
  it('should handle initial state', () => {
    const initialAction = { type: '', payload: undefined }
    expect(todosReducer(undefined, initialAction)).toEqual([])
  })

  it('should handle ADD_TODO', () => {
    expect(
      todosReducer([], {
        type: 'ADD_TODO',
        payload: { newTodo: { text: 'Run the tests' } }
      })
    ).toEqual([
      {
        text: 'Run the tests',
        completed: false
      }
    ])

    expect(
      todosReducer(
        [
          {
            text: 'Run the tests',
            completed: false
          }
        ],
        {
          type: 'ADD_TODO',
          payload: { newTodo: { text: 'Use Redux' } }
        }
      )
    ).toEqual([
      {
        text: 'Run the tests',
        completed: false
      },
      {
        text: 'Use Redux',
        completed: false
      }
    ])

    expect(
      todosReducer(
        [
          {
            text: 'Run the tests',
            completed: false
          },
          {
            text: 'Use Redux',
            completed: false
          }
        ],
        {
          type: 'ADD_TODO',
          payload: { newTodo: { text: 'Fix the tests' } }
        }
      )
    ).toEqual([
      {
        text: 'Run the tests',
        completed: false
      },
      {
        text: 'Use Redux',
        completed: false
      },
      {
        text: 'Fix the tests',
        completed: false
      }
    ])
  })

  it('should handle TOGGLE_TODO', () => {
    expect(
      todosReducer(
        [
          {
            text: 'Run the tests',
            completed: false
          },
          {
            text: 'Use Redux',
            completed: false
          }
        ],
        {
          type: 'TOGGLE_TODO',
          payload: { index: 0 }
        }
      )
    ).toEqual([
      {
        text: 'Run the tests',
        completed: true
      },
      {
        text: 'Use Redux',
        completed: false
      }
    ])
  })
}
