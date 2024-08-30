import { createEntityAdapter, createSlice, nanoid } from '@reduxjs/toolkit'

function withPayload() {
    throw new Error('Function not implemented.')
}

export const todoAdapter = createEntityAdapter()

const todoSlice = createSlice({
    name: 'todo',
    initialState: todoAdapter.getInitialState(),

    reducers: (create) => ({
        property: create.reducer(() => { }),

        method: create.reducer((state, action) => {
            todoAdapter.addOne(state, action)
        }),

        identifier: create.reducer(todoAdapter.removeOne),

        preparedProperty: create.preparedReducer((todo) => ({
            payload: { id: nanoid(), ...todo }
        }), () => { }),

        preparedMethod: create.preparedReducer((todo) => {
            return { payload: { id: nanoid(), ...todo } }
        }, (state, action) => {
            todoAdapter.addOne(state, action)
        }),

        preparedIdentifier: create.preparedReducer(withPayload(), todoAdapter.setMany)
    })
})
