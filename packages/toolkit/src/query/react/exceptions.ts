import type { SerializedError } from '@reduxjs/toolkit'

const errorName = 'SuspenseQueryError'

const computeErrorMessage = (reason: any, endpointName: string): string => {
  let reasonMessage = reason?.message ?? ''

  return (
    `${errorName} suspense error of ${endpointName}` +
    (reasonMessage && `: ${reasonMessage}`)
  )
}

export class SuspenseQueryError implements SerializedError {
  message: string
  name: string

  constructor(
    public reason: unknown,
    public endpointName: string,
    public retryQuery: () => void
  ) {
    this.message = computeErrorMessage(reason, endpointName)
    this.name = errorName
  }

  get code(): string | undefined {
    let reasonCode = (this.reason as any)?.code ?? undefined

    return reasonCode && String(reasonCode)
  }
}
