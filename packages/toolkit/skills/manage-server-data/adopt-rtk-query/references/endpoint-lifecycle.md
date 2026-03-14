# Endpoint Lifecycle

## Invalidation rule

When a mutation invalidates tags:

- active subscribers refetch
- inactive cache entries are removed
- removed entries fetch again only when something subscribes later

That behavior is deliberate; invalidation is not a background "refresh everything" switch.

## Document cache tradeoff

RTK Query is a document cache, not a normalized entity graph cache.

Use RTK Query by default when:

- the data comes from request/response APIs
- document caching is acceptable
- tag invalidation and endpoint lifecycles solve the problem

Reach for a different tool when:

- the real requirement is a normalized graph cache
- the stack already has a domain-specific normalized client that fits better

If normalized caching is mandatory and no better library is already in the stack, a slice plus thunk flow may be the fallback.

## Useful endpoint options

- `providesTags`: tell RTK Query what cache entries this query represents
- `invalidatesTags`: tell RTK Query what a mutation dirties
- `onQueryStarted`: optimistic and pessimistic updates tied to a request
- `onCacheEntryAdded`: long-lived subscriptions such as streaming data
- `keepUnusedDataFor`: how long inactive cache entries stay around
