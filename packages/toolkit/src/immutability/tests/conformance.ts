import type { ImmutabilityAdapter, Patch } from '../adapter'
import { immerAdapterWithPatches } from '../immerAdapter'

interface Assertion {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toThrow(): void
  toHaveLength(length: number): void
  toContain(item: unknown): void
  not: Assertion
}

export interface ConformanceRunner {
  describe: (name: string, body: () => void) => void
  it: (name: string, body: () => void) => void
  expect: (actual: unknown) => Assertion
}

export interface ConformanceOptions {
  /**
   * Adapters whose patches this adapter must be able to apply, and the
   * reverse. Defaults to the Immer adapter.
   */
  compareWith?: [name: string, adapter: ImmutabilityAdapter][]
}

type Todo = { id: number; title: string; done: boolean }
type TodoState = { todos: Todo[]; meta: { count: number } }

class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

const makeState = (): TodoState => ({
  todos: [
    { id: 1, title: 'a', done: false },
    { id: 2, title: 'b', done: false },
    { id: 3, title: 'c', done: false },
  ],
  meta: { count: 3 },
})

/**
 * Registers tests that check an `ImmutabilityAdapter` against the behavior
 * RTK relies on. Pass the test runner's `describe`, `it` and `expect`.
 * The patch groups run only when the adapter has patch support.
 */
export function runImmutabilityAdapterConformance(
  name: string,
  adapter: ImmutabilityAdapter,
  { describe, it: registerTest, expect }: ConformanceRunner,
  {
    compareWith = [['immer', immerAdapterWithPatches]],
  }: ConformanceOptions = {},
) {
  const it = (title: string, body: (warnings: unknown[][]) => void) =>
    registerTest(title, () => {
      const warnings: unknown[][] = []
      const originalWarn = console.warn
      console.warn = (...args: unknown[]) => {
        warnings.push(args)
      }
      try {
        body(warnings)
      } finally {
        console.warn = originalWarn
      }
    })

  describe(`${name} adapter conformance`, () => {
    describe('produce and recipe return values', () => {
      it('applies mutations and keeps structural sharing', () => {
        const base = makeState()
        const next = adapter.produce(base, (draft) => {
          draft.todos[0].done = true
        })
        expect(next).not.toBe(base)
        expect(next.todos[0]).toEqual({ id: 1, title: 'a', done: true })
        expect(next.todos[1]).toBe(base.todos[1])
        expect(next.meta).toBe(base.meta)
        expect(base.todos[0].done).toBe(false)
      })

      it('returns the base when the recipe changes nothing', () => {
        const base = makeState()
        expect(adapter.produce(base, () => {})).toBe(base)
      })

      it('uses a fresh object returned from the recipe', () => {
        const base = makeState()
        const replacement = { todos: [], meta: { count: 0 } }
        const next = adapter.produce(base, () => replacement)
        expect(next).toEqual(replacement)
      })

      it('accepts a returned object that contains drafts', () => {
        const base = makeState()
        const next = adapter.produce(base, (draft) => ({
          todos: draft.todos.filter((todo) => todo.id !== 2),
          meta: draft.meta,
        }))
        expect(next.todos.map((todo) => todo.id)).toEqual([1, 3])
        expect(next.todos[0]).toBe(base.todos[0])
        expect(next.meta).toBe(base.meta)
        expect(adapter.isDraft(next.todos[0])).toBe(false)
        expect(adapter.isDraft(next.meta)).toBe(false)
      })

      it('accepts the draft itself as the return value', () => {
        const base = makeState()
        const next = adapter.produce(base, (draft) => {
          draft.meta.count = 4
          return draft
        })
        expect(next.meta.count).toBe(4)
        expect(adapter.isDraft(next)).toBe(false)
      })

      it('runs a recipe over a primitive base', () => {
        expect(adapter.produce(1, (value) => value + 1)).toBe(2)
        expect(adapter.produce('a' as string, () => undefined)).toBe('a')
      })

      it('does not warn when a recipe returns a replacement', (warnings) => {
        adapter.produce(makeState(), () => ({ todos: [], meta: { count: 0 } }))
        adapter.produce(makeState(), (draft) => ({
          todos: draft.todos,
          meta: { count: 0 },
        }))
        expect(warnings).toEqual([])
      })
    })

    describe('isDraftable matches what produce drafts', () => {
      const cases: [string, () => unknown][] = [
        ['plain object', () => ({ a: 1 })],
        ['array', () => [1]],
        ['Map', () => new Map()],
        ['Set', () => new Set()],
        ['null-prototype object', () => Object.create(null)],
        ['class instance', () => new Point(1, 2)],
        ['Date', () => new Date(0)],
        ['number', () => 1],
        ['null', () => null],
      ]

      for (const [label, make] of cases) {
        it(label, () => {
          const value = make()
          if (adapter.isDraftable(value)) {
            let drafted = false
            adapter.produce(value, (draft) => {
              drafted = adapter.isDraft(draft)
            })
            expect(drafted).toBe(true)
          } else if (typeof value === 'object' && value !== null) {
            // Callers must check isDraftable before producing over an object.
            expect(() => adapter.produce(value, () => {})).toThrow()
          } else {
            let received: unknown
            const next = adapter.produce(value, (draft) => {
              received = draft
              return draft
            })
            expect(received).toBe(value)
            expect(next).toBe(value)
          }
        })
      }

      it('treats plain objects, arrays, Map and Set as draftable', () => {
        expect(adapter.isDraftable({})).toBe(true)
        expect(adapter.isDraftable([])).toBe(true)
        expect(adapter.isDraftable(new Map())).toBe(true)
        expect(adapter.isDraftable(new Set())).toBe(true)
        expect(adapter.isDraftable(Object.create(null))).toBe(true)
      })

      it('treats class instances and Dates as not draftable', () => {
        expect(adapter.isDraftable(new Point(1, 2))).toBe(false)
        expect(adapter.isDraftable(new Date(0))).toBe(false)
      })

      it('treats primitives as not draftable', () => {
        expect(adapter.isDraftable(1)).toBe(false)
        expect(adapter.isDraftable('a')).toBe(false)
        expect(adapter.isDraftable(null)).toBe(false)
        expect(adapter.isDraftable(undefined)).toBe(false)
      })
    })

    describe('current and original', () => {
      it('return non-drafts unchanged', () => {
        const value = { a: 1 }
        expect(adapter.current(value)).toBe(value)
        expect(adapter.original(value)).toBe(value)
        expect(adapter.current(1)).toBe(1)
        expect(adapter.original(null)).toBe(null)
      })

      it('read the draft state and the base inside a recipe', () => {
        const base = makeState()
        adapter.produce(base, (draft) => {
          draft.meta.count = 5
          const snapshot = adapter.current(draft)
          expect(adapter.isDraft(snapshot)).toBe(false)
          expect(snapshot.meta.count).toBe(5)
          expect(adapter.original(draft)).toBe(base)
          expect(adapter.original(draft.meta)).toBe(base.meta)
        })
      })
    })

    describe('freezing', () => {
      it('deep-freezes the produce result', () => {
        const next = adapter.produce(makeState(), (draft) => {
          draft.todos.push({ id: 4, title: 'd', done: false })
        })
        expect(Object.isFrozen(next)).toBe(true)
        expect(Object.isFrozen(next.todos)).toBe(true)
        expect(Object.isFrozen(next.todos[3])).toBe(true)
      })

      it('freezes untouched subtrees of the produce result', () => {
        const next = adapter.produce(makeState(), (draft) => {
          draft.meta.count = 4
        })
        expect(Object.isFrozen(next.todos)).toBe(true)
        expect(Object.isFrozen(next.todos[0])).toBe(true)
      })

      it('deep-freezes a returned replacement', () => {
        const next = adapter.produce(makeState(), () => ({
          todos: [{ id: 1, title: 'a', done: false }],
          meta: { count: 1 },
        }))
        expect(Object.isFrozen(next)).toBe(true)
        expect(Object.isFrozen(next.todos[0])).toBe(true)
      })

      it('deep-freezes with freezeDraftable and returns the same value', (warnings) => {
        const value = {
          nested: { list: [1] },
          map: new Map([['a', { n: 1 }]]),
        }
        expect(adapter.freezeDraftable(value)).toBe(value)
        expect(Object.isFrozen(value.nested.list)).toBe(true)
        expect(Object.isFrozen(value.map.get('a'))).toBe(true)
        expect(warnings).toEqual([])
      })
    })

    const patches = adapter.patches
    if (!patches) return

    describe('patches', () => {
      it('produces path patches for object changes', () => {
        const base = makeState()
        const [next, forward, inverse] = patches.produceWithPatches(
          base,
          (draft) => {
            draft.todos[1].title = 'B'
          },
        )
        expect(next.todos[1].title).toBe('B')
        expect(forward).toEqual([
          { op: 'replace', path: ['todos', 1, 'title'], value: 'B' },
        ])
        expect(inverse).toEqual([
          { op: 'replace', path: ['todos', 1, 'title'], value: 'b' },
        ])
      })

      it('produces patches for array push', () => {
        const base = makeState()
        const added = { id: 4, title: 'd', done: false }
        const [, forward] = patches.produceWithPatches(base, (draft) => {
          draft.todos.push(added)
        })
        expect(forward).toEqual([
          { op: 'add', path: ['todos', 3], value: added },
        ])
      })

      it('round-trips array truncation through the inverse patches', () => {
        const base = makeState()
        const [next, forward, inverse] = patches.produceWithPatches(
          base,
          (draft) => {
            draft.todos.length = 1
          },
        )
        expect(next.todos).toHaveLength(1)
        expect(patches.applyPatches(base, forward)).toEqual(next)
        expect(patches.applyPatches(next, inverse)).toEqual(base)
      })

      it('round-trips array splice and unshift', () => {
        const base = makeState()
        const [next, forward, inverse] = patches.produceWithPatches(
          base,
          (draft) => {
            draft.todos.splice(1, 1)
            draft.todos.unshift({ id: 0, title: 'z', done: true })
          },
        )
        expect(next.todos.map((todo) => todo.id)).toEqual([0, 1, 3])
        expect(patches.applyPatches(base, forward)).toEqual(next)
        expect(patches.applyPatches(next, inverse)).toEqual(base)
      })

      it('round-trips Map changes', () => {
        const base = { map: new Map([['a', { n: 1 }]]) }
        const [next, forward, inverse] = patches.produceWithPatches(
          base,
          (draft) => {
            draft.map.get('a')!.n = 2
            draft.map.set('b', { n: 3 })
          },
        )
        expect(next.map.get('a')).toEqual({ n: 2 })
        expect(patches.applyPatches(base, forward)).toEqual(next)
        expect(patches.applyPatches(next, inverse)).toEqual(base)
      })

      it('round-trips Set changes', () => {
        const base = { set: new Set(['a', 'b']) }
        const [next, forward, inverse] = patches.produceWithPatches(
          base,
          (draft) => {
            draft.set.delete('a')
            draft.set.add('c')
          },
        )
        expect([...next.set].sort()).toEqual(['b', 'c'])
        expect(patches.applyPatches(base, forward)).toEqual(next)
        expect(patches.applyPatches(next, inverse)).toEqual(base)
      })

      it('produces a root replace patch when the recipe returns a value', () => {
        const base = makeState()
        const replacement = { todos: [], meta: { count: 0 } }
        const [next, forward, inverse] = patches.produceWithPatches(
          base,
          () => replacement,
        )
        expect(next).toEqual(replacement)
        expect(forward).toEqual([
          { op: 'replace', path: [], value: replacement },
        ])
        expect(inverse).toEqual([{ op: 'replace', path: [], value: base }])
      })

      it('handles a non-draftable base', () => {
        const [next, forward, inverse] = patches.produceWithPatches(
          'abc' as string,
          () => 'xyz',
        )
        expect(next).toBe('xyz')
        expect(forward).toEqual([{ op: 'replace', path: [], value: 'xyz' }])
        expect(inverse).toEqual([{ op: 'replace', path: [], value: 'abc' }])
      })

      it('does not touch the base when applying to a plain value', () => {
        const base = makeState()
        const snapshot = structuredClone(base)
        const next = patches.applyPatches(base, [
          { op: 'replace', path: ['meta', 'count'], value: 10 },
        ])
        expect(next.meta.count).toBe(10)
        expect(base).toEqual(snapshot)
      })

      it('applies to a frozen base', () => {
        const base = adapter.freezeDraftable(makeState())
        const next = patches.applyPatches(base, [
          { op: 'replace', path: ['meta', 'count'], value: 10 },
        ])
        expect(next.meta.count).toBe(10)
        expect(base.meta.count).toBe(3)
      })

      it('freezes the result of applying patches to a plain base', () => {
        const next = patches.applyPatches(makeState(), [
          { op: 'replace', path: ['meta'], value: { count: 9 } },
        ])
        expect(Object.isFrozen(next)).toBe(true)
        expect(Object.isFrozen(next.meta)).toBe(true)
      })

      it('freezes the patched result of produceWithPatches', () => {
        const [next] = patches.produceWithPatches(makeState(), (draft) => {
          draft.meta.count = 1
        })
        expect(Object.isFrozen(next)).toBe(true)
        expect(Object.isFrozen(next.todos[0])).toBe(true)
      })
    })

    describe('exact patch format', () => {
      it('emits only op, path and value keys with array paths', () => {
        const [, forward, inverse] = patches.produceWithPatches(
          { a: { b: [1, 2] }, m: new Map([['k', 1]]) },
          (draft) => {
            draft.a.b.push(3)
            draft.m.set('k', 2)
          },
        )
        for (const patch of [...forward, ...inverse]) {
          expect(['add', 'remove', 'replace']).toContain(patch.op)
          expect(Array.isArray(patch.path)).toBe(true)
          for (const key of Object.keys(patch)) {
            expect(['op', 'path', 'value']).toContain(key)
          }
        }
      })

      for (const [otherName, other] of compareWith) {
        if (!other.patches) continue
        const otherPatches = other.patches
        const recipe = (draft: TodoState) => {
          draft.todos.splice(0, 1)
          draft.todos.push({ id: 9, title: 'x', done: false })
          draft.meta.count = 3
        }

        it(`applies patches produced by the ${otherName} adapter`, () => {
          const base = makeState()
          const [next, forward, inverse] = otherPatches.produceWithPatches(
            base,
            recipe,
          )
          expect(patches.applyPatches(base, forward)).toEqual(next)
          expect(patches.applyPatches(next, inverse)).toEqual(base)
        })

        it(`produces patches the ${otherName} adapter applies`, () => {
          const base = makeState()
          const [next, forward, inverse] = patches.produceWithPatches(
            base,
            recipe,
          )
          expect(otherPatches.applyPatches(base, forward)).toEqual(next)
          expect(otherPatches.applyPatches(next, inverse)).toEqual(base)
        })
      }
    })

    describe('hand-built subscription patches', () => {
      type Subscriptions = Record<
        string,
        Record<string, { pollingInterval?: number }>
      >
      const subscriptionPatches: Patch[] = [
        { op: 'add', path: ['getPosts(undefined)'], value: { req1: {} } },
        { op: 'remove', path: ['getUser(1)'] },
        { op: 'remove', path: ['neverExisted(1)'] },
      ]
      const makeSubscriptions = (): Subscriptions => ({
        'getUser(1)': { req0: {} },
        'getUser(2)': { req2: { pollingInterval: 10 } },
      })
      const expected = {
        'getPosts(undefined)': { req1: {} },
        'getUser(2)': { req2: { pollingInterval: 10 } },
      }

      it('applies onto a plain base', () => {
        const base = makeSubscriptions()
        expect(patches.applyPatches(base, subscriptionPatches)).toEqual(
          expected,
        )
        expect(base).toEqual(makeSubscriptions())
      })

      it('applies onto a draft and returns it from the recipe', (warnings) => {
        const base = makeSubscriptions()
        const next = adapter.produce(base, (draft) =>
          patches.applyPatches(draft, subscriptionPatches),
        )
        expect(next).toEqual(expected)
        expect(adapter.isDraft(next)).toBe(false)
        expect(warnings).toEqual([])
      })

      it('applies onto a nested draft without returning it', () => {
        const base = { slice: makeSubscriptions(), other: { x: 1 } }
        const next = adapter.produce(base, (draft) => {
          patches.applyPatches(draft.slice, subscriptionPatches)
        })
        expect(next.slice).toEqual(expected)
        expect(next.other).toBe(base.other)
      })

      it('throws when adding a key under a missing parent', () => {
        const base: Record<string, Record<string, unknown>> = {}
        expect(() =>
          patches.applyPatches(base, [
            { op: 'add', path: ['missing', 'child'], value: 1 },
          ]),
        ).toThrow()
      })
    })

    // These mirror what RTK Query does with the adapter's patch support:
    // optimistic updates, `patchQueryData` and subscription sync.
    describe('RTK Query patterns', () => {
      type QueryState = { queries: Record<string, { data: unknown }> }
      const makeQueries = (): QueryState => ({
        queries: { 'getTodos(undefined)': { data: makeState() } },
      })

      const updateQueryData = <T>(
        state: QueryState,
        recipe: (draft: T) => T | void,
      ) => {
        const data = state.queries['getTodos(undefined)'].data as T
        if (adapter.isDraftable(data)) {
          const [, forward, inverse] = patches.produceWithPatches(
            data,
            recipe as (draft: unknown) => T | void,
          )
          return { patches: forward, inversePatches: inverse }
        }
        const value = recipe(data)
        return {
          patches: [{ op: 'replace', path: [], value }] as Patch[],
          inversePatches: [{ op: 'replace', path: [], value: data }] as Patch[],
        }
      }

      const patchQueryData = (state: QueryState, toApply: readonly Patch[]) =>
        adapter.produce(state, (draft) => {
          const substate = draft.queries['getTodos(undefined)']
          substate.data = patches.applyPatches(substate.data, toApply)
        })

      it('undoes the first of two overlapping optimistic updates', (warnings) => {
        let state = adapter.freezeDraftable(makeQueries())

        const first = updateQueryData<TodoState>(state, (draft) => {
          draft.todos[0].done = true
        })
        state = patchQueryData(state, first.patches)

        const second = updateQueryData<TodoState>(state, (draft) => {
          draft.todos.push({ id: 4, title: 'd', done: false })
          draft.meta.count = 4
        })
        state = patchQueryData(state, second.patches)

        state = patchQueryData(state, first.inversePatches)

        const data = state.queries['getTodos(undefined)'].data as TodoState
        expect(data.todos.map((todo) => [todo.id, todo.done])).toEqual([
          [1, false],
          [2, false],
          [3, false],
          [4, false],
        ])
        expect(data.meta.count).toBe(4)
        expect(Object.isFrozen(data.todos[3])).toBe(true)
        expect(warnings).toEqual([])
      })

      it('replaces non-draftable data at the root', () => {
        let state = adapter.produce(makeQueries(), (draft) => {
          draft.queries['getTodos(undefined)'].data = 5
        })
        const update = updateQueryData<number>(state, (value) => value + 1)
        state = patchQueryData(state, update.patches)
        expect(state.queries['getTodos(undefined)'].data).toBe(6)
        state = patchQueryData(state, update.inversePatches)
        expect(state.queries['getTodos(undefined)'].data).toBe(5)
      })

      it('replaces draftable data with a returned value', () => {
        let state = makeQueries()
        const update = updateQueryData<TodoState>(state, () => ({
          todos: [],
          meta: { count: 0 },
        }))
        state = patchQueryData(state, update.patches)
        expect(state.queries['getTodos(undefined)'].data).toEqual({
          todos: [],
          meta: { count: 0 },
        })
        state = patchQueryData(state, update.inversePatches)
        expect(state.queries['getTodos(undefined)'].data).toEqual(makeState())
      })

      it('syncs subscriptions repeatedly without warnings', (warnings) => {
        let subscriptions: Record<string, Record<string, object>> = {}
        for (let i = 0; i < 5; i++) {
          subscriptions = adapter.produce(subscriptions, (draft) =>
            patches.applyPatches(draft, [
              { op: 'add', path: [`q${i}`], value: { [`r${i}`]: {} } },
              { op: 'remove', path: [`q${i - 2}`] },
            ]),
          )
        }
        expect(Object.keys(subscriptions).sort()).toEqual(['q3', 'q4'])
        expect(warnings).toEqual([])
      })
    })
  })
}
