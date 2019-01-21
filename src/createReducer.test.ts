import { createReducer, CaseReducer } from './createReducer'
import { PayloadAction } from './createAction'
import { Reducer } from 'redux'

interface Todo {
  text: string
  completed: boolean
}

type TodoState = Todo[]
type TodosReducer = Reducer<TodoState, PayloadAction>
type TodosCaseReducer = CaseReducer<TodoState, PayloadAction>

describe('createReducer', () => {
  describe('given impure reducers with immer', () => {
    const addTodo: TodosCaseReducer = (state, action) => {
      const { newTodo } = action.payload

      // Can safely call state.push() here
      state.push({ ...newTodo, completed: false })
    }

    const toggleTodo: TodosCaseReducer = (state, action) => {
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
    const addTodo: TodosCaseReducer = (state, action) => {
      const { newTodo } = action.payload

      // Updates the state immutably without relying on immer
      return [...state, { ...newTodo, completed: false }]
    }

    const toggleTodo: TodosCaseReducer = (state, action) => {
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
