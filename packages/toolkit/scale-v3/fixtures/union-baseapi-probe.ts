// PROBE: Lenz's "endpoints shared across multiple base apis" question.
//
// Can an endpoint-creator surface be typed against a UNION of base apis
// (`endpointsFor<typeof api1 | typeof api2>()`) such that the resulting
// endpoints are safe to attach to EITHER api?
//
// Variance analysis per slot:
//   - `request` RETURNS a base-query arg  -> must satisfy BOTH apis -> INTERSECTION of arg types
//   - `transformResponse` RECEIVES raw    -> could come from either  -> UNION of raw types
//   - error / meta                        -> receive slots           -> UNION
//   - `providesTags` produces tags        -> must exist in both apis -> INTERSECTION of tag unions
//
// Naive `BaseQueryArg<BQ1 | BQ2>` distributes and yields the UNION of args,
// which is unsound for the `request` return slot. This probe verifies the
// corrected encodings work and reject the right negatives.
//
// Type-check only; never executed.

import type {
  BaseQueryArg,
  BaseQueryError,
  BaseQueryFn,
  BaseQueryMeta,
  BaseQueryResult,
} from '../../src/query/baseQueryTypes'

// ---------------------------------------------------------------------------
// Two deliberately different base queries
// ---------------------------------------------------------------------------

interface ResA {
  fromA: true
  payload: unknown
}
interface ErrA {
  status: number
}
interface MetaA {
  reqId: string
}
type ArgsA = string | { url: string; method?: string }

interface ResB {
  fromB: true
  body: unknown
}
interface ErrB {
  code: string
}
interface MetaB {
  traceId: number
}
type ArgsB = string | { docId: number; op: 'get' | 'list' }

declare const bq1: BaseQueryFn<ArgsA, ResA, ErrA, {}, MetaA>
declare const bq2: BaseQueryFn<ArgsB, ResB, ErrB, {}, MetaB>

type BQ1 = typeof bq1
type BQ2 = typeof bq2

// ---------------------------------------------------------------------------
// Minimal $types-bearing base-api stand-ins
// ---------------------------------------------------------------------------

interface BaseApiTypesBag {
  baseQuery: BaseQueryFn
  tagTypes: string
  reducerPath: string
}

interface BaseApiLike {
  $types: BaseApiTypesBag
}

declare const api1: {
  $types: { baseQuery: BQ1; tagTypes: 'Todo' | 'User'; reducerPath: 'api1' }
}
declare const api2: {
  $types: { baseQuery: BQ2; tagTypes: 'User' | 'Doc'; reducerPath: 'api2' }
}

type Apis = typeof api1 | typeof api2

// ---------------------------------------------------------------------------
// Q1: what do the raw extractors give for a UNION of base queries?
// ---------------------------------------------------------------------------

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false
type Expect<T extends true> = T

type UnionBQ = BQ1 | BQ2

// BaseQueryArg distributes -> UNION of args (documented: unsound for `request` return)
type _q1a = Expect<Equal<BaseQueryArg<UnionBQ>, ArgsA | ArgsB>>
// Result / error / meta also distribute -> unions (fine for receive slots)
type _q1b = Expect<Equal<BaseQueryResult<UnionBQ>, ResA | ResB>>
type _q1c = Expect<Equal<BaseQueryError<UnionBQ>, ErrA | ErrB>>
type _q1d = Expect<Equal<BaseQueryMeta<UnionBQ>, MetaA | MetaB>>

// ---------------------------------------------------------------------------
// Q2: corrected encodings
// ---------------------------------------------------------------------------

// Intersection of per-api base-query arg types, via boxed contravariant inference
// (plain UnionToIntersection over the flattened arg union would collapse to never).
type BoxedArg<A> = A extends BaseApiLike
  ? (x: BaseQueryArg<A['$types']['baseQuery']>) => void
  : never
type SharedRequestReturn<A extends BaseApiLike> =
  BoxedArg<A> extends (x: infer I) => void ? I : never

// Intersection of tag unions, same boxing trick
type BoxedTags<A> = A extends BaseApiLike
  ? (x: A['$types']['tagTypes']) => void
  : never
type SharedTags<A extends BaseApiLike> =
  BoxedTags<A> extends (x: infer I) => void ? I : never

// Unions for the receive slots (distribute per api)
type SharedRaw<A extends BaseApiLike> = A extends BaseApiLike
  ? BaseQueryResult<A['$types']['baseQuery']>
  : never
type SharedError<A extends BaseApiLike> = A extends BaseApiLike
  ? BaseQueryError<A['$types']['baseQuery']>
  : never

// Verify the computed slot types
// intersection of (string | {url}) and (string | {docId; op})
//   = string | ({url; method?} & {docId; op})
type _q2a = Expect<
  Equal<
    SharedRequestReturn<Apis>,
    | string
    | ({ url: string; method?: string } & { docId: number; op: 'get' | 'list' })
  >
>
// intersection of ('Todo'|'User') and ('User'|'Doc') = 'User'
type _q2b = Expect<Equal<SharedTags<Apis>, 'User'>>
type _q2c = Expect<Equal<SharedRaw<Apis>, ResA | ResB>>
type _q2d = Expect<Equal<SharedError<Apis>, ErrA | ErrB>>

// ---------------------------------------------------------------------------
// Q3: does a creator typed with these slots accept/reject the right bodies?
// ---------------------------------------------------------------------------

interface SharedQueryBody<Result, Arg, A extends BaseApiLike> {
  request: (arg: Arg) => SharedRequestReturn<A>
  transformResponse?: (raw: SharedRaw<A>, meta: unknown, arg: Arg) => Result
  transformErrorResponse?: (err: SharedError<A>) => unknown
  providesTags?: readonly SharedTags<A>[]
}

interface SharedStamp<Result, Arg> {
  $shared: { result: Result; arg: Arg }
}

interface SharedCreators<A extends BaseApiLike> {
  query<Result, Arg>(body: SharedQueryBody<Result, Arg, A>): SharedStamp<Result, Arg>
}

// The double-invocation Lenz sketched, to pin the api union explicitly
// while leaving Result/Arg inferable per endpoint.
declare function endpointsFor<A extends BaseApiLike>(): SharedCreators<A>

const shared = endpointsFor<Apis>()

interface Todo {
  id: string
  title: string
}

// String requests are valid against both base queries.
const okString = shared.query<Todo, string>({
  request: (id) => `/todos/${id}`,
  transformErrorResponse: (err) => {
    // receive slot is the union; must narrow before member access
    if ('status' in err) return err.status
    return err.code
  },
  providesTags: ['User'],
})
const _okString: SharedStamp<Todo, string> = okString

// NEGATIVES ----------------------------------------------------------------

// An object request valid only for api1 must be rejected.
shared.query<Todo, string>({
  // @ts-expect-error {url} satisfies bq1 but not bq2
  request: (id) => ({ url: `/todos/${id}` }),
})

// A tag that exists in only one api must be rejected.
shared.query<Todo, string>({
  request: (id) => `/todos/${id}`,
  // @ts-expect-error 'Todo' exists on api1 only; shared tags = 'User'
  providesTags: ['Todo'],
})

// Accessing a member of one error shape without narrowing must be rejected.
shared.query<Todo, string>({
  request: (id) => `/todos/${id}`,
  // @ts-expect-error err is ErrA | ErrB; .status is not on ErrB
  transformErrorResponse: (err) => err.status,
})

export {}
