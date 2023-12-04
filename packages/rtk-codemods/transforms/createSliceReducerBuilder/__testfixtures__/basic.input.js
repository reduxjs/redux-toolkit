const aSlice = createSlice({
  name: 'name',
  initialState: todoAdapter.getInitialState(),
  reducers: {
    property: () => {},
    method(state, action) {
      todoAdapter.setMany(state, action);
    },
    identifier: todoAdapter.removeOne,
    preparedProperty: {
      prepare: (todo) => ({ payload: { id: nanoid(), ...todo } }),
      reducer: () => {}
    },
    preparedMethod: {
      prepare(todo) {
        return { payload: { id: nanoid(), ...todo } }
      },
      reducer(state, action) {
        todoAdapter.setMany(state, action);
      }
    },
    preparedIdentifier: {
      prepare: withPayload(),
      reducer: todoAdapter.setMany
    },
  }
})