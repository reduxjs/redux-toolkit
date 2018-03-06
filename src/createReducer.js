import createNextState from "immer";
import { isFSA } from "flux-standard-action";

export function createReducer(initialState, actionsMap) {
    return function(state = initialState, action) {
        const {type, payload, ...rest} = action;

        return createNextState(state, draft => {
            const caseReducer = actionsMap[type];

            if(caseReducer) {
                if (isFSA(action)) {
                    return caseReducer(draft, payload, rest);
                }

                return caseReducer(draft,  rest);
            }

            return draft;
        });
    }
}