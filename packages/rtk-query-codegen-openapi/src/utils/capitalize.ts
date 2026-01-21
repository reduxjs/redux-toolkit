export function capitalize<InputString extends string>(str: InputString): Capitalize<InputString> {
  return str.replace(str[0], str[0].toUpperCase()) as Capitalize<InputString>;
}
