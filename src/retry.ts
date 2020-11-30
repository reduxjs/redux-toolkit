import { BaseQueryEnhancer } from './apiTypes';
import { HandledError } from './buildThunks';

async function defaultBackoff(attempt: number = 0, maxRetries: number = 5) {
  const attempts = Math.min(attempt, maxRetries);
  /**
   * Exponential backoff that would give a baseline like:
   * 1 - 600ms + rand
   * 2 - 1200ms + rand
   * 3 - 2400ms + rand
   * 4 - 4800ms + rand
   * 5 - 9600ms + rand
   */
  const timeout = ~~((Math.random() + 0.4) * (300 << attempts)); // Force a positive int in the case we make this an option
  await new Promise((resolve) => setTimeout((res) => resolve(res), timeout));
}

interface StaggerOptions {
  /**
   * How many times the query will be retried (default: 5)
   */
  maxRetries?: number;
  backoff?: (attempt: number, maxRetries: number) => Promise<void>;
}

function fail(e: any): never {
  throw Object.assign(new HandledError({ error: e }), { throwImmediately: true });
}

const retryWithBackoff: BaseQueryEnhancer<unknown, StaggerOptions, StaggerOptions | void> = (
  baseQuery,
  defaultOptions
) => async (args, api, extraOptions) => {
  const options = { maxRetries: 5, backoff: defaultBackoff, ...defaultOptions, ...extraOptions };
  let retry = 0;

  while (true) {
    try {
      const result = await baseQuery(args, api, extraOptions);
      // baseQueries _should_ return an error property, so we should check for that and throw it to continue retrying
      if (result.error) {
        throw new HandledError(result);
      }
      return result;
    } catch (e) {
      retry++;
      if (e.throwImmediately || retry > options.maxRetries) {
        if (e instanceof HandledError) {
          return e.value;
        }

        // We don't know what this is, so we have to rethrow it
        throw e;
      }
      await options.backoff(retry, options.maxRetries);
    }
  }
};

export const retry = Object.assign(retryWithBackoff, { fail });
