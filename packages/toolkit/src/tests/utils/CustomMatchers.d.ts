import type { Assertion, AsymmetricMatchersContaining } from 'vitest'

interface CustomMatchers<R = unknown> {
  toMatchSequence(...matchers: Array<(arg: any) => boolean>): R
}

declare module 'vitest' {
  interface Assertion<R = any, T = any> extends CustomMatchers<R> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
