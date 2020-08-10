import {
  CurriedType as RRCurriedType,
  CurryableTypes as RRCurryableType
} from './react-redux'
import {
  CurriedType as RTKCurriedType,
  CurryableTypes as RTKCurryableType
} from './RTK'

import { UnionToIntersection } from '../tsHelpers'

export interface CurryArgs {
  Dispatch: any
  RootState: any
  ThunkExtraArgument: any
}

type CurrySingleType<Args extends CurryArgs> = UnionToIntersection<
  {
    [K in keyof CurryableTypes]: (
      curry: CurryableTypes[K]
    ) => CurriedType<Args>[K]
  }[keyof CurryableTypes]
>

type CurryMultipleTypes<Args extends CurryArgs> = {
  <Obj extends Partial<CurryableTypes>>(obj: Obj): Pick<
    CurriedType<Args>,
    keyof Obj & keyof CurriedType<any>
  >
}

export type CurryType<Args extends CurryArgs> = CurrySingleType<Args> &
  CurryMultipleTypes<Args>

export interface CurryableTypes extends RRCurryableType, RTKCurryableType {}

export interface CurriedType<Args extends CurryArgs>
  extends RRCurriedType<Args['RootState'], Args['Dispatch']>,
    RTKCurriedType<Args> {}
