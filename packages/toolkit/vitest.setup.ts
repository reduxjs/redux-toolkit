import type { UnknownAction } from '@reduxjs/toolkit'
import {
  createConsole,
  getLog,
  mockConsole,
} from 'console-testing-library/pure'
import nodeFetch, { Headers, Request } from 'node-fetch'
import { server } from './src/query/tests/mocks/server'
import { normalize } from './src/tests/utils/helpers'

vi.stubGlobal('fetch', nodeFetch)
vi.stubGlobal('Request', Request)
vi.stubGlobal('Headers', Headers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveConsoleOutput(expectedOutput: string): Promise<R>
      toMatchSequence(...matchers: Array<(arg: any) => boolean>): R
    }
  }
}

expect.extend({
  async toHaveConsoleOutput(
    fn: () => void | Promise<void>,
    expectedOutput: string,
  ) {
    const restore = mockConsole(createConsole())
    await fn()
    const { log } = getLog()
    restore()

    if (normalize(log) === normalize(expectedOutput))
      return {
        message: () => `Console output matches
===
${expectedOutput}
===`,
        pass: true,
      }
    else
      return {
        message: () => `Console output
===
${log}
===
does not match
===
${expectedOutput}
===`,
        pass: false,
      }
  },

  toMatchSequence(
    _actions: UnknownAction[],
    ...matchers: Array<(arg: any) => boolean>
  ) {
    const actions = _actions.concat()
    actions.shift() // remove INIT

    for (let i = 0; i < matchers.length; i++) {
      if (!matchers[i](actions[i])) {
        return {
          message: () =>
            `Action ${actions[i].type} does not match sequence at position ${i}.
All actions:
${actions.map((a) => a.type).join('\n')}`,
          pass: false,
        }
      }
    }
    return {
      message: () => `All actions match the sequence.`,
      pass: true,
    }
  },
})
