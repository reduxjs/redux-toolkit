const aSlice = createSlice({
  name: 'name',
  initialState: todoAdapter.getInitialState(),

  reducers: (create) => ({
    property: create.reducer(() => {}),

    method: create.reducer((state, action) => {
      todoAdapter.setMany(state, action);
    }),

    identifier: create.reducer(todoAdapter.removeOne),
    preparedProperty: create.preparedReducer((todo) => ({ payload: { id: nanoid(), ...todo } }), () => {}),

    preparedMethod: create.preparedReducer((todo) => {
      return { payload: { id: nanoid(), ...todo } }
    }, (state, action) => {
      todoAdapter.setMany(state, action);
    }),

    preparedIdentifier: create.preparedReducer(withPayload(), todoAdapter.setMany)
  })
})