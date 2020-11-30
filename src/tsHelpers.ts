export type Id<T> = { [K in keyof T]: T[K] } & {};
export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type Override<T1, T2> = T2 extends any ? Omit<T1, keyof T2> & T2 : never;
export function assertCast<T>(v: any): asserts v is T {}

/**
 * Convert a Union type `(A|B)` to and intersecion type `(A&B)`
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type NonOptionalKeys<T> = { [K in keyof T]-?: undefined extends T[K] ? never : K }[keyof T];

export type HasRequiredProps<T, True, False> = NonOptionalKeys<T> extends never ? False : True;

export type OptionalIfAllPropsOptional<T> = HasRequiredProps<T, T, T | never>;
