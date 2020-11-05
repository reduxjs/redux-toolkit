import { Action, AnyAction, ActionCreator } from 'redux'
import {
  createAction,
  createAsyncThunk,
  isAllOf,
  isAnyOf
} from '../../src'
import { IsAny } from 'src/tsHelpers'

function expectType<T>(p: T): T {
  return p
}

/* isAnyOf */

/*
 * Test: isAnyOf correctly narrows types when used with action creators
 */
function isAnyOfActionTest(action: AnyAction) {
  const actionA = createAction('a', () => {
    return {
      payload: {
        prop1: 1,
        prop3: 2
      }
    };
  })

  const actionB = createAction('b', () => {
    return {
      payload: {
        prop1: 1,
        prop2: 2
      }
    };
  })

  if (isAnyOf(actionA, actionB)(action)) {
    return {
      prop1: action.payload.prop1,
      // typings:expect-error
      prop2: action.payload.prop2,
      // typings:expect-error
      prop3: action.payload.prop3
    };
  }
}

/*
 * Test: isAnyOf correctly narrows types when used with async thunks
 */

function isAnyOfThunkTest(action: AnyAction) {
  const asyncThunk1 = createAsyncThunk<{prop1: number, prop3: number}>(
    'asyncThunk1',

    async () => {
      return {
        prop1: 1,
        prop3: 3
      };
    }
  );

  const asyncThunk2 = createAsyncThunk<{prop1: number, prop2: number}>(
    'asyncThunk2',

    async () => {
      return {
        prop1: 1,
        prop2: 2
      };
    }
  );

  if (isAnyOf(asyncThunk1.fulfilled, asyncThunk2.fulfilled)(action)) {
    return {
      prop1: action.payload.prop1,
      // typings:expect-error
      prop2: action.payload.prop2,
      // typings:expect-error
      prop3: action.payload.prop3
    };
  }
}

/*
 * Test: isAnyOf correctly narrows types when used with type guards
 */
function isAnyOfTypeGuardTest(action: AnyAction) {
  interface ActionA {
    type: 'a';
    payload: {
      prop1: 1,
      prop3: 2
    };
  }

  interface ActionB {
    type: 'b';
    payload: {
      prop1: 1,
      prop2: 2
    }
  }

  const guardA = (v: any): v is ActionA => {
    return v.type === 'a';
  }

  const guardB = (v: any): v is ActionB => {
    return v.type === 'b';
  }


  if (isAnyOf(guardA, guardB)(action)) {
    return {
      prop1: action.payload.prop1,
      // typings:expect-error
      prop2: action.payload.prop2,
      // typings:expect-error
      prop3: action.payload.prop3
    };
  }
}

/* isAllOf */

/*
 * Test: isAnyOf correctly narrows types when used with action creators
 */
function isAllOfActionTest(action: AnyAction) {
  const actionA = createAction('a', () => {
    return {
      payload: {
        prop1: 1,
        prop3: 2
      }
    };
  })

  const actionB = createAction('b', () => {
    return {
      payload: {
        prop1: 1,
        prop2: 2
      }
    };
  })

  // note: this condition can never be true, but it lets us test the types
  if (isAllOf(actionA, actionB)(action)) {
    return {
      prop1: action.payload.prop1,
      prop2: action.payload.prop2,
      prop3: action.payload.prop3
    };
  }
}

/*
 * Test: isAllOf correctly narrows types when used with async thunks
 */

function isAllOfThunkTest(action: AnyAction) {
  const asyncThunk1 = createAsyncThunk<{prop1: number, prop3: number}>(
    'asyncThunk1',

    async () => {
      return {
        prop1: 1,
        prop3: 3
      };
    }
  );

  const asyncThunk2 = createAsyncThunk<{prop1: number, prop2: number}>(
    'asyncThunk2',

    async () => {
      return {
        prop1: 1,
        prop2: 2
      };
    }
  );

  // note: this condition can never be true, but it lets us test the types
  if (isAllOf(asyncThunk1.fulfilled, asyncThunk2.fulfilled)(action)) {
    return {
      prop1: action.payload.prop1,
      prop2: action.payload.prop2,
      prop3: action.payload.prop3
    };
  }
}

/*
 * Test: isAnyOf correctly narrows types when used with type guards
 */
function isAllOfTypeGuardTest(action: AnyAction) {
  interface ActionA {
    type: 'a';
    payload: {
      prop1: 1,
      prop3: 2
    };
  }

  interface ActionB {
    type: 'b';
    payload: {
      prop1: 1,
      prop2: 2
    }
  }

  const guardA = (v: any): v is ActionA => {
    return v.type === 'a';
  }

  const guardB = (v: any): v is ActionB => {
    return v.type === 'b';
  }

  // note: this condition can never be true, but it lets us test the types
  if (isAllOf(guardA, guardB)(action)) {
    return {
      prop1: action.payload.prop1,
      prop2: action.payload.prop2,
      prop3: action.payload.prop3
    };
  }
}
