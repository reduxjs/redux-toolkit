process.on('unhandledRejection', error => {
  console.error(
    `We throw this specifically to break tests if a promise is not handled`,
    error
  )
  throw error
})
