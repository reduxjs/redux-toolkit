import type { IfMaybeUndefined } from '@reduxjs/toolkit/dist/tsHelpers'

// helpers that should be imported like `import('@reduxjs/toolkit/src/userland')`

const getValue = () => (({} as Record<string, 0>).a)

export type UncheckedIndexedAccess<T> = IfMaybeUndefined<
  ReturnType<typeof getValue>,
  T | undefined,
  T
>
