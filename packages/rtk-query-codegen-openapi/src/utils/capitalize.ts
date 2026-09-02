/**
 * Upper-cases the first character of a string, leaving the rest as-is.
 *
 * @param str - The string to capitalize.
 * @returns The string with its first character upper-cased.
 * @throws A {@linkcode TypeError} if {@linkcode str} is empty, since there is no first character to upper-case.
 *
 * @since 1.0.0
 * @public
 */
export function capitalize(str: string) {
  return str.replace(str[0], str[0].toUpperCase());
}
