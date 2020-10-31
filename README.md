What this is:

This is an experiment to create a generic api client based on (and potentially to be shipped with) redux toolkit that allows for effective querying of non-normalized api endpoints with some global caching & cache invalidation mechanisms.

TODOS:

* [x] create a PR against RTK that adds .requestId to the returned promise
* [ ] split up that monster file
* [ ] more useful tests
* [ ] think about invalidation after all subscribers for a query have unsubscibed (+60 seconds or so)
* [ ] basic invalidation: when a mutation invalidates an entity type, refetch all queries that provided that type
* [ ] advanced invalidation: differentiate between mutations invalidating all entities of a type or single entities vs queries providing a single entity/a number of unspecified entities
* [ ] hooks should return a promise (requires RTK patch from above)
* [ ] add a condition that prevents a query from re-running when a second component subscribes to the same query with the same arguments
* [ ] return a refetch function from useQuery that does said refetch
* [ ] implement a skip option for useQuery to prevent fetching on initial render
