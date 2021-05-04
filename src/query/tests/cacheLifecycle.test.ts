const onNewCacheEntry = jest.fn()
const gotFirstValue = jest.fn()
const onCleanup = jest.fn()

// scenarios:
/*
onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
})
*/

/*
onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    await cleanupPromise
    onCleanup()
})
*/

/*
onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    const value = await valueResolvedPromise
    gotFirstValue(value)
    await cleanupPromise
    onCleanup()
})
// extra scenario to test & document: 
// if cleanup happens before `valueResolvedPromise` resolves, `valueResolvedPromise` will throw, *also* skipping `onCleanup`
*/

/*
// recommended if some cleanup is always necessary:

onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    try {
      const value = await valueResolvedPromise
      gotFirstValue(value)
    } catch {
      neverGotAValue()
    }
    await cleanupPromise
    onCleanup()
})
*/

/*
// recommended if cleanup is only necessary when something was started after first value in cache:

onCacheEntryAdded((arg) => {
    onNewCacheEntry(arg)
    try {
      const value = await valueResolvedPromise
      gotFirstValue(value)
      await cleanupPromise
      onCleanup()
    } catch {
    }
})
*/
