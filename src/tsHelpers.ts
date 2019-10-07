// taken from https://github.com/joonhocho/tsdef
// return True if T is `any`, otherwise return False
export type IsAny<T, True, False = never> = (
  | True
  | False) extends (T extends never ? True : False)
  ? True
  : False

// taken from https://github.com/joonhocho/tsdef
// return True if T is `unknown`, otherwise return False
export type IsUnknown<T, True, False = never> = unknown extends T
  ? IsAny<T, False, True>
  : False

export type IsEmptyObj<T, True, False = never> = T extends any
  ? {} extends T
    ? IsUnknown<T, False, IsAny<T, False, True>>
    : False
  : never

/**
 * returns True if TS version is above 3.5, False if below.
 * uses feature detection to detect TS version >= 3.5
 * * versions below 3.5 will return `{}` for unresolvable interference
 * * versions above will return `unknown`
 * */
export type AtLeastTS35<True, False> = IsUnknown<
  ReturnType<<T>() => T>,
  True,
  False
>

export type IsUnknownOrNonInferrable<T, True, False> = AtLeastTS35<
  IsUnknown<T, True, False>,
  IsEmptyObj<T, True, False>
>
