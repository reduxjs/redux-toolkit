import createNextState from "immer";
import { isFSA } from "flux-standard-action";

export function createReducer(initialState, actionsMap) {
    return function(state = initialState, action) {
        const {type, ...rest} = action;

        return createNextState(state, draft => {
            const caseReducer = actionsMap[type];

            if(caseReducer) {
                if (isFSA(action)) {
                    const {payload, error, meta} = rest
                    return caseReducer(draft, payload, { error, meta });
                }

                return caseReducer(draft,  rest);
            }

            return draft;
        });
    }
}