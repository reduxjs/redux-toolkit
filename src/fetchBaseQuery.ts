import { joinUrls } from './utils';
import { isPlainObject } from '@reduxjs/toolkit';
import { BaseQueryFn } from './apiTypes';

export type ResponseHandler = 'json' | 'text' | ((response: Response) => Promise<any>);

export interface FetchArgs extends RequestInit {
  url: string;
  params?: Record<string, any>;
  body?: any;
  responseHandler?: ResponseHandler;
  validateStatus?: (response: Response, body: any) => boolean;
}

const defaultValidateStatus = (response: Response) => response.status >= 200 && response.status <= 299;

const isJsonContentType = (headers: Headers) => headers.get('content-type')?.trim()?.startsWith('application/json');

const handleResponse = async (response: Response, responseHandler: ResponseHandler) => {
  if (typeof responseHandler === 'function') {
    return responseHandler(response);
  }

  if (responseHandler === 'text') {
    return response.text();
  }

  if (responseHandler === 'json') {
    const text = await response.text();
    return text.length ? JSON.parse(text) : undefined;
  }
};

export interface FetchBaseQueryError {
  status: number;
  data: unknown;
}

export function fetchBaseQuery({
  baseUrl,
  prepareHeaders = (x) => x,
  fetchFn = fetch,
  ...baseFetchOptions
}: {
  baseUrl?: string;
  prepareHeaders?: (headers: Headers, api: { getState: () => unknown }) => Headers;
  /**
   * Accepts a custom `fetch` function if you do not want to use the default on the window.
   * Useful in SSR environments if you need to pass isomorphic-fetch or cross-fetch
   */
  fetchFn?: (input: RequestInfo, init?: RequestInit | undefined) => Promise<Response>;
} & RequestInit = {}): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}> {
  return async (arg, { signal, getState }) => {
    let {
      url,
      method = 'GET' as const,
      headers = new Headers({}),
      body = undefined,
      params = undefined,
      responseHandler = 'json' as const,
      validateStatus = defaultValidateStatus,
      ...rest
    } = typeof arg == 'string' ? { url: arg } : arg;
    let config: RequestInit = {
      ...baseFetchOptions,
      method,
      signal,
      body,
      ...rest,
    };

    config.headers = prepareHeaders(new Headers(headers), { getState });

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

    const response = await fetchFn(url, config);
    const resultData = await handleResponse(response, responseHandler);

    return validateStatus(response, resultData)
      ? { data: resultData }
      : { error: { status: response.status, data: resultData } };
  };
}
