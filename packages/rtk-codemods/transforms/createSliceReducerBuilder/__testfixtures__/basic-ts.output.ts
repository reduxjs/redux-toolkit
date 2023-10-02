const aSlice = createSlice({
  name: 'name',
  initialState: todoAdapter.getInitialState(),

  reducers: (create) => ({
    property: create.reducer(() => {}),

    method: create.reducer((state, action: PayloadAction<Todo>) => {
      todoAdapter.addOne(state, action);
    }),

    identifier: create.reducer(todoAdapter.removeOne),
    preparedProperty: create.preparedReducer((todo: Todo) => ({ payload: { id: nanoid(), ...todo } }), () => {}),

    preparedMethod: create.preparedReducer((todo: Todo) => {
      return { payload: { id: nanoid(), ...todo } }
    }, (state, action: PayloadAction<Todo>) => {
      todoAdapter.addOne(state, action);
    }),

    preparedIdentifier: create.preparedReducer(withPayload(), todoAdapter.setMany)
  })
})