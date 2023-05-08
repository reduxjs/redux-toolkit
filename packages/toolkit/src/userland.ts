/*
these helpers should be imported like `import('@reduxjs/toolkit/src/userland').Helper<T>`
because they depend on remaining as a .ts file instead of being in a .d.ts
*/

type IfMaybeUndefined<P, True, False> = [undefined] extends [P] ? True : False

const value = ({} as Record<string, 0>).a

export type UncheckedIndexedAccess<T> = IfMaybeUndefined<
  typeof value,
  T | undefined,
  T
>
