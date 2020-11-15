export function expectType<T>(t: T) {
  return t;
}
export const ANY = 0 as any;

export function waitMs(time = 150) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
