/**
 * Checks whether a string parses as an absolute URL, used to tell a remote
 * schema location apart from a local file path.
 *
 * Parsing is done with the {@linkcode URL} constructor, so a relative path
 * such as `./schema.json` is not considered valid.
 *
 * @param string - The string to test.
 * @returns `true` if the string parses as a URL, `false` otherwise.
 *
 * @since 1.0.0
 * @public
 */
export function isValidUrl(string: string) {
  try {
    new URL(string);
  } catch (_) {
    return false;
  }

  return true;
}
