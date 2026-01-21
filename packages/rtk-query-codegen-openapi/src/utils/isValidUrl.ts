export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
  } catch (_) {
    return false;
  }

  return true;
}
