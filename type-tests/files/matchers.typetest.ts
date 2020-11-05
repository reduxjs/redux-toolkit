import { AnyAction } from 'redux'
import { createAction, createAsyncThunk, isAllOf, isAnyOf } from '../../src'

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

interface SpecialAction {
  payload: {
    special: boolean;
  }
}

const isSpecialAction = (v: any): v is SpecialAction => {
  return v.meta.isSpecial;
}

/*
 * Test: isAllOf correctly narrows types when used with action creators
 *       and type guards
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

  if (isAllOf(actionA, isSpecialAction)(action)) {
    return {
      prop1: action.payload.prop1,
      // typings:expect-error
      prop2: action.payload.prop2,
      prop3: action.payload.prop3,
      special: action.payload.special
    };
  }
}

/*
 * Test: isAllOf correctly narrows types when used with async thunks
 *       and type guards
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

  if (isAllOf(asyncThunk1.fulfilled, isSpecialAction)(action)) {
    return {
      prop1: action.payload.prop1,
      // typings:expect-error
      prop2: action.payload.prop2,
      prop3: action.payload.prop3,
      special: action.payload.special
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

  const guardA = (v: any): v is ActionA => {
    return v.type === 'a';
  }

  if (isAllOf(guardA, isSpecialAction)(action)) {
    return {
      prop1: action.payload.prop1,
      // typings:expect-error
      prop2: action.payload.prop2,
      prop3: action.payload.prop3,
      special: action.payload.special
    };
  }
}
