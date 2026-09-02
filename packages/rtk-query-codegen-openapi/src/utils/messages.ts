/**
 * Message strings describing failures to resolve a `--baseQuery` file.
 *
 * **Currently unused.** Nothing in this package reads
 * {@linkcode MESSAGES}, and the CLI accepts no flags at all - it takes a
 * single config file path - so none of the `--baseQuery`, `--baseUrl` or
 * `-c, --config` options these messages mention exist. The messages are
 * kept only so the wording is not lost if those options are reinstated.
 *
 * @since 1.0.0
 * @public
 */
export const MESSAGES = {
  /**
   * For a named export that is absent or empty in the resolved file.
   */
  NAMED_EXPORT_MISSING: `You specified a named export that does not exist or was empty.`,

  /**
   * For a file that exists but has no default export to use.
   */
  DEFAULT_EXPORT_MISSING: `Specified file exists, but no default export was found for the --baseQuery`,

  /**
   * For a file that cannot be found.
   */
  FILE_NOT_FOUND: `Unable to locate the specified file provided to --baseQuery`,

  /**
   * For a config file that cannot be found.
   */
  TSCONFIG_FILE_NOT_FOUND: `Unable to locate the specified file provided to -c, --config`,

  /**
   * For a base url that is ignored because a base query supplies its own.
   */
  BASE_URL_IGNORED: `The url provided to --baseUrl is ignored when using --baseQuery`,
};
