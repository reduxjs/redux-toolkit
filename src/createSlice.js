import createNextState from 'immer';

const defaultReducer = (state) => state;
const getType = (slice, action) =>
  slice ? `${slice}/${action}` : action;

export default function createSlice({
  slice = '',
  actions = {},
  initialState,
}) {
  const actionKeys = Object.keys(actions);

  const reducerMap = actionKeys.reduce(
    (map, action) => {
      map[getType(slice, action)] = actions[action];
      return map;
    },
    {},
  );

  const reducer = (state = initialState, { type, payload }) => {
    const actionReducer = reducerMap[type] || defaultReducer;
    const produce = (draft) => actionReducer(draft, payload);
    return createNextState(state, produce);
  };

  const actionMap = actionKeys.reduce(
    (map, action) => {
      map[action] = (payload) => ({
        type: getType(slice, action),
        payload,
      });

      return map;
    },
    {},
  );

  return {
    actions: actionMap,
    reducer,
    slice,
  };
}
