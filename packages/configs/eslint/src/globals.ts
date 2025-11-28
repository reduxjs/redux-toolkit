import type { Linter } from 'eslint'
import globalIdentifiers from 'globals'

const { browser, node, nodeBuiltin, vitest } = globalIdentifiers

/**
 * An object representing the
 * {@link https://vitest.dev/config/#globals | globals} provided by
 * {@link https://vitest.dev | **Vitest**} for use in testing.
 *
 * @since 0.0.1
 * @public
 */
export const vitestGlobals = {
  afterAll: 'writable',
  afterEach: 'writable',
  assert: 'writable',
  assertType: 'writable',
  beforeAll: 'writable',
  beforeEach: 'writable',
  chai: 'writable',
  describe: 'writable',
  expect: 'writable',
  expectTypeOf: 'writable',
  it: 'writable',
  onTestFailed: 'writable',
  onTestFinished: 'writable',
  suite: 'writable',
  test: 'writable',
  vi: 'writable',
  vitest: 'writable',
} as const satisfies Linter.Globals satisfies Record<
  keyof typeof vitest,
  Extract<Linter.GlobalConf, 'writable'>
>

/**
 * An object that specifies which global
 * variables are available during linting.
 *
 * @since 0.0.1
 * @public
 */
export const globals =
  /* @__PURE__ */
  Object.assign(
    {
      ...browser,
      ...node,
      ...nodeBuiltin,
    } as const satisfies Linter.Globals,

    {
      ...vitest,
      ...vitestGlobals,
    } as const satisfies Linter.Globals,
  ) satisfies Linter.Globals
