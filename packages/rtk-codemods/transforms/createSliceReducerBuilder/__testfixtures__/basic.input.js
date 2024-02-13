import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload() {
    throw new Error('Function not implemented.')
}

export const todoAdapter = createEntityAdapter()

const todoSlice = createSlice({
    name: 'todo',
    initialState: todoAdapter.getInitialState(),
    reducers: {
        property: () => { },
        method(state, action) {
            todoAdapter.addOne(state, action)
        },
        identifier: todoAdapter.removeOne,
        preparedProperty: {
            prepare: (todo) => ({
                payload: { id: nanoid(), ...todo }
            }),
            reducer: () => { }
        },
        preparedMethod: {
            prepare(todo) {
                return { payload: { id: nanoid(), ...todo } }
            },
            reducer(state, action) {
                todoAdapter.addOne(state, action)
            }
        },
        preparedIdentifier: {
            prepare: withPayload(),
            reducer: todoAdapter.setMany
        }
    }
})
