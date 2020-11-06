import { QueryApi } from './buildThunks';

interface FetchArgs extends RequestInit {
  url: string;
}

export function fetchBaseQuery({ baseUrl }: { baseUrl: string } = { baseUrl: '' }) {
  return async (arg: string | FetchArgs, { signal, rejectWithValue }: QueryApi) => {
    const { url, method = 'GET', ...rest } = typeof arg == 'string' ? { url: arg } : arg;
    const result = await fetch(`${baseUrl}/${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      ...rest,
    });

    let resultData =
      result.headers.has('Content-Type') && !result.headers.get('Content-Type')?.trim()?.startsWith('application/json')
        ? await result.text()
        : await result.json();

    return result.status >= 200 && result.status <= 299
      ? resultData
      : rejectWithValue({ status: result.status, data: resultData });
  };
}
