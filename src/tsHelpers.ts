export type Id<T> = { [K in keyof T]: T[K] } & {};
export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Override<T1, T2> = T2 extends any ? Omit<T1, keyof T2> & T2 : never;
export function assertCast<T>(v: any): asserts v is T {}

/**
 * Convert a Union type `(A|B)` to and intersecion type `(A&B)`
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type BaseQueryArg<T extends (arg: any, ...args: any[]) => any> = T extends (arg: infer A, ...args: any[]) => any
  ? A
  : any;
