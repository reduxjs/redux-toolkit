import 'vitest'

interface CustomMatchers<R = unknown> {
  toMatchSequence(...matchers: ((arg: any) => boolean)[]): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

declare global {
  namespace jest {
    interface Matchers<R> extends CustomMatchers<R> {}
  }
}
