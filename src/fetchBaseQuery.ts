import { QueryApi } from './buildThunks';
import { joinUrls } from './utils';
import { isPlainObject } from '@reduxjs/toolkit';

interface FetchArgs extends RequestInit {
  url: string;
  params?: Record<string, any>;
  body?: any;
  responseHandler?: 'json' | 'text' | ((response: Response) => Promise<any>);
  validateStatus?: (response: Response, body: any) => boolean;
}

const defaultValidateStatus = (response: Response) => response.status >= 200 && response.status <= 299;

const isJsonContentType = (headers: Headers) => headers.get('content-type')?.trim()?.startsWith('application/json');

export function fetchBaseQuery({ baseUrl }: { baseUrl?: string } = {}) {
  return async (arg: string | FetchArgs, { signal, rejectWithValue }: QueryApi) => {
    let {
      url,
      method = 'GET' as const,
      headers = undefined,
      body = undefined,
      params = undefined,
      responseHandler = 'json' as const,
      validateStatus = defaultValidateStatus,
      ...rest
    } = typeof arg == 'string' ? { url: arg } : arg;
    let config: RequestInit = {
      method,
      signal,
      body,
      ...rest,
    };

    config.headers = new Headers(headers);

    if (!config.headers.has('content-type')) {
      config.headers.set('content-type', 'application/json');
    }

    if (body && isPlainObject(body) && isJsonContentType(config.headers)) {
      config.body = JSON.stringify(body);
    }

    if (params) {
      const divider = ~url.indexOf('?') ? '&' : '?';
      const query = new URLSearchParams(params);
      url += divider + query;
    }

    url = joinUrls(baseUrl, url);

    const response = await fetch(url, config);

    const resultData =
      typeof responseHandler === 'function'
        ? await responseHandler(response)
        : await response[responseHandler || 'text']();

    return validateStatus(response, resultData)
      ? resultData
      : rejectWithValue({ status: response.status, data: resultData });
  };
}
