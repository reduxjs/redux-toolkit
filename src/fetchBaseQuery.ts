import { QueryApi } from './buildThunks';

interface FetchArgs extends RequestInit {
  queryString: string;
}

export function fetchBaseQuery({ baseUrl }: { baseUrl: string }) {
  return async ({ queryString, method = 'GET', ...rest }: FetchArgs, { signal, rejectWithValue }: QueryApi) => {
    const result = await fetch(`${baseUrl}/${queryString}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      ...rest,
    });

    let resultData =
      result.headers.get('Content-Type') === 'application/json' ? await result.json() : await result.text();

    return result.status >= 200 && result.status <= 299
      ? resultData
      : rejectWithValue({ status: result.status, data: resultData });
  };
}
