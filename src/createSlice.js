import { createReducer } from './createReducer';

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

  const reducer = createReducer(initialState, reducerMap);

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
