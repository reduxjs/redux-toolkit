/**
 * Determines whether a url is absolute: it either starts with a scheme
 * (`https://example.com`) or is protocol-relative (`//example.com`).
 *
 * The test is anchored to the start of the string on purpose. A relative url can
 * legitimately carry an absolute one inside its query string, as in
 * `redirect?target=https://example.com`, and treating that as absolute would make
 * `joinUrls` drop the `baseUrl`.
 *
 * @param url string
 */
export function isAbsoluteUrl(url: string) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
}
