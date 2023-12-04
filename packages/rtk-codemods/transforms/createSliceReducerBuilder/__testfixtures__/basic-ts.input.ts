const aSlice = createSlice({
  name: 'name',
  initialState: todoAdapter.getInitialState(),
  reducers: {
    property: () => {},
    method(state, action: PayloadAction<Todo>) {
      todoAdapter.addOne(state, action);
    },
    identifier: todoAdapter.removeOne,
    preparedProperty: {
      prepare: (todo: Todo) => ({ payload: { id: nanoid(), ...todo } }),
      reducer: () => {}
    },
    preparedMethod: {
      prepare(todo: Todo) {
        return { payload: { id: nanoid(), ...todo } }
      },
      reducer(state, action: PayloadAction<Todo>) {
        todoAdapter.addOne(state, action);
      }
    },
    preparedIdentifier: {
      prepare: withPayload(),
      reducer: todoAdapter.setMany
    },
  }
})