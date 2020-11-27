import { AnyAction } from 'redux'
import { createAction, createAsyncThunk, isAllOf, isAnyOf } from '../../src'
import { isAsyncThunkAction, isFulfilled, isPending, isRejected } from '../../src/matchers'

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

/*
 * Test: isPending correctly narrows types
 */
function isPendingTest(action: AnyAction) {
  const thunk = createAsyncThunk<string>('a', () => 'result')

  if (isPending(thunk)(action)) {
    return {
      // we should expect the payload to be undefined
      // typings:expect-error
      prop1: action.payload.charAt(0),
      // we should not expect an error property
      // typings:expect-error
      prop2: action.error,
    };
  }
}

/*
 * Test: isRejected correctly narrows types
 */
function isRejectedTest(action: AnyAction) {
  const thunk = createAsyncThunk<string>('a', () => 'result')

  if (isRejected(thunk)(action)) {
    return {
      // we should expect the payload to be defined ...
      prop1a: action.payload,
      // ... but of unknown type
      // typings:expect-error
      prop1b: action.payload.charAt(0),
      // we should expect the error property to be defined
      prop2: action.error,
    };
  }
}

/*
 * Test: isFulfilled correctly narrows types
 */
function isFulfilledTest(action: AnyAction) {
  const thunk = createAsyncThunk<string>('a', () => 'result')

  if (isFulfilled(thunk)(action)) {
    return {
      // we should expect the payload to be defined (in this case a string)
      prop1: action.payload.charAt(0),
      // we should not expect an error property
      // typings:expect-error
      prop2: action.error,
    };
  }
}

/*
 * Test: isAsyncThunkAction correctly narrows types
 */
function isAsyncThunkActionTest(action: AnyAction) {
  const thunk = createAsyncThunk<string>('a', () => 'result')

  if (isAsyncThunkAction(thunk)(action)) {
    return {
      // we should expect the payload to be defined ...
      prop1a: action.payload,
      // ... but of unknown type because the action may be pending/rejected
      // typings:expect-error
      prop1b: action.payload.charAt(0),
      // do not expect an error property because pending/fulfilled lack it
      // typings:expect-error
      prop2: action.error,
    };
  }
}
