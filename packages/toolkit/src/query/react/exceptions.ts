const computeErrorMessage = (reason: any, queryKey: string) => {
  let message = `rtk-query suspense error ${queryKey}: `

  if (reason instanceof Error) {
    message += reason
  } else if (typeof reason === 'object' && reason !== null) {
    const relevantProperties = [reason?.status, reason?.code, reason?.error]

    for (const property of relevantProperties) {
      if (property) {
        message += ` ${property}`
      }
    }
  } else {
    message += reason
  }

  return message
}

export class SuspenseQueryError extends Error {
  constructor(
    public reason: unknown,
    public endpointName: string,
    public retryQuery: () => void
  ) {
    super(computeErrorMessage(reason, endpointName))
    this.reason = reason
    this.name = 'SuspenseQueryError'

    // https://www.typescriptlang.org/docs/handbook/2/classes.html#inheriting-built-in-types
    Object.setPrototypeOf(this, SuspenseQueryError.prototype)
  }
}
