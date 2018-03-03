import createNextState from "immer";

export function createReducer(initialState, actionsMap) {
    return function(state = initialState, action) {
        const {type, payload} = action;

        return createNextState(state, draft => {
            const caseReducer = actionsMap[type];

            if(caseReducer) {
                return caseReducer(draft, payload);
            }

            return draft;
        });
    }
}