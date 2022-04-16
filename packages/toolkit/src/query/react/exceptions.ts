const computeErrorMessage = (reason: any, queryKey: string) => {
  let message = `rtk-query suspense error ${queryKey}: `

  if (reason instanceof Error) {
    message += reason
  } else if (typeof reason === 'object' && reason !== null) {
    ;[reason?.status, reason?.code, reason?.error].forEach((value) => {
      if (value) {
        message += ` ${value}`
      }
    })
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
  }
}
