import { createSlice } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { setupApiStore } from './helpers';

const defaultHeaders: Record<string, string> = {
  fake: 'header',
  delete: 'true',
  delete2: '1',
};

let fetchSpy: jest.SpyInstance<Promise<Response>, any>;

beforeEach(() => {
  fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockClear();
});

const baseUrl = 'http://example.com';

const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;

    // If we have a token set in state, let's assume that we should be passing it.
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    // A user could customize their behavior here, so we'll just test that custom scenarios would work.
    const potentiallyConflictingKeys = Object.keys(defaultHeaders);
    potentiallyConflictingKeys.forEach((key) => {
      // Check for presence of a default key, if the incoming endpoint headers don't specify it as '', then set it
      const existingValue = headers.get(key);
      if (!existingValue && existingValue !== '') {
        headers.set(key, String(defaultHeaders[key]));
        // If an endpoint sets a header with a value of '', just delete the header.
      } else if (headers.get(key) === '') {
        headers.delete(key);
      }
    });

    return headers;
  },
});

const api = createApi({
  baseQuery,
  endpoints(build) {
    return {
      query: build.query({ query: () => ({ url: '/query', headers: {} }) }),
      mutation: build.mutation({ query: () => ({ url: '/mutation', method: 'POST', credentials: 'omit' }) }),
    };
  },
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: '',
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
    },
  },
});

const storeRef = setupApiStore(api, { auth: authSlice.reducer });
type RootState = ReturnType<typeof storeRef.store.getState>;

describe('fetchBaseQuery', () => {
  describe('basic functionality', () => {
    it('should return an object for a simple GET request when it is json data', async () => {
      const req = baseQuery('/success', {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      });
      expect(req).toBeInstanceOf(Promise);
      const res = await req;
      expect(res).toBeInstanceOf(Object);
      expect(res.data).toEqual({ value: 'success' });
    });

    it('should return an error and status for error responses', async () => {
      const req = baseQuery('/error', {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      });
      expect(req).toBeInstanceOf(Promise);
      const res = await req;
      expect(res).toBeInstanceOf(Object);
      expect(res.error).toEqual({ status: 500, data: { value: 'error' } });
    });
  });

  describe('arg.body', () => {
    test('an object provided to body will be serialized when content-type is json', async () => {
      const data = {
        test: 'value',
      };

      await baseQuery(
        { url: '/success', body: data, method: 'POST' },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );

      const [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('content-type')).toBe('application/json');
      expect(options.body).toEqual(JSON.stringify(data));
    });

    test('an object provided to body will not be serialized when content-type is not json', async () => {
      const data = {
        test: 'value',
      };

      await baseQuery(
        { url: '/success', body: data, method: 'POST', headers: { 'content-type': 'text/html' } },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );

      const [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('content-type')).toBe('text/html');
      expect(options.body).toEqual(data);
    });
  });

  describe('arg.params', () => {
    it('should not serialize missing params', async () => {
      await baseQuery(
        { url: '/success' },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );

      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/success`, expect.any(Object));
    });

    it('should serialize numeric and boolean params', async () => {
      const params = { a: 1, b: true };

      await baseQuery(
        { url: '/success', params },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );

      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/success?a=1&b=true`, expect.any(Object));
    });

    it('should merge params into existing url querystring', async () => {
      const params = { a: 1, b: true };
      await baseQuery(
        { url: '/success?banana=pudding', params },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );
      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/success?banana=pudding&a=1&b=true`, expect.any(Object));
    });

    it('should accept a URLSearchParams instance', async () => {
      const params = new URLSearchParams({ apple: 'fruit' });
      await baseQuery(
        { url: '/success', params },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );
      expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/success?apple=fruit`, expect.any(Object));
    });
  });

  describe('validateStatus', () => {
    test('validateStatus can return an error even on normal 200 responses', async () => {
      // This is a scenario where an API may always return a 200, but indicates there is an error when success = false
      const res = await baseQuery(
        {
          url: '/nonstandard-error',
          validateStatus: (response, body) => (response.status === 200 && body.success === false ? false : true),
        },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );

      expect(res.error).toEqual({
        status: 200,
        data: { success: false, message: 'This returns a 200 but is really an error' },
      });
    });
  });

  describe('arg.headers and prepareHeaders', () => {
    test('uses the default headers set in prepareHeaders', async () => {
      await baseQuery('/success', {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      });

      const [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('content-type')).toBe('application/json');
      expect(options.headers.get('fake')).toBe(defaultHeaders['fake']);
      expect(options.headers.get('delete')).toBe(defaultHeaders['delete']);
      expect(options.headers.get('delete2')).toBe(defaultHeaders['delete2']);
    });

    test('adds endpoint-level headers to the defaults', async () => {
      await baseQuery(
        { url: '/success', headers: { authorization: 'Bearer banana' } },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );
      const [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('authorization')).toBe('Bearer banana');
      expect(options.headers.get('content-type')).toBe('application/json');
      expect(options.headers.get('fake')).toBe(defaultHeaders['fake']);
      expect(options.headers.get('delete')).toBe(defaultHeaders['delete']);
      expect(options.headers.get('delete2')).toBe(defaultHeaders['delete2']);
    });

    test('it does not set application/json when content-type is set', async () => {
      await baseQuery(
        { url: '/success', headers: { authorization: 'Bearer banana', 'content-type': 'custom-content-type' } },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );
      const [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('authorization')).toBe('Bearer banana');
      expect(options.headers.get('content-type')).toBe('custom-content-type');
      expect(options.headers.get('fake')).toBe(defaultHeaders['fake']);
      expect(options.headers.get('delete')).toBe(defaultHeaders['delete']);
      expect(options.headers.get('delete2')).toBe(defaultHeaders['delete2']);
    });

    test('respects the headers from an endpoint over the base headers', async () => {
      const fake = 'fake endpoint value';

      await baseQuery(
        { url: '/success', headers: { fake, delete: '', delete2: '' } },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );
      const [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('fake')).toBe(fake);
      expect(options.headers.get('delete')).toBeNull();
      expect(options.headers.get('delete2')).toBeNull();
    });

    test('prepareHeaders is able to select from a state', async () => {
      const doRequest = async () =>
        await baseQuery(
          { url: '/success' },
          {
            signal: undefined,
            dispatch: storeRef.store.dispatch,
            getState: storeRef.store.getState,
          }
        );

      doRequest();

      let [, options] = fetchSpy.mock.calls[0];

      expect(options.headers.get('authorization')).toBeNull();

      // Set a token and the follow up request should have the header injected by prepareHeaders
      const token = 'fakeToken!';
      storeRef.store.dispatch(authSlice.actions.setToken(token));
      doRequest();

      [, options] = fetchSpy.mock.calls[1];

      expect(options.headers.get('authorization')).toBe(`Bearer ${token}`);
    });
  });
});
