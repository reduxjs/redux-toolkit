import {
  CurriedType as RRCurriedType,
  CurryableTypes as RRCurryableType
} from './react-redux'
import { UnionToIntersection } from '../tsHelpers'

type CurrySingleType<RootState, Dispatch> = UnionToIntersection<
  {
    [K in keyof CurryableTypes]: (
      curry: CurryableTypes[K]
    ) => CurriedType<RootState, Dispatch>[K]
  }[keyof CurryableTypes]
>

type CurryMultipleTypes<RootState, Dispatch> = {
  <Obj extends Partial<CurryableTypes>>(obj: Obj): Pick<
    CurriedType<RootState, Dispatch>,
    keyof Obj & keyof CurriedType<any, any>
  >
}

export type CurryType<RootState, Dispatch> = CurrySingleType<
  RootState,
  Dispatch
> &
  CurryMultipleTypes<RootState, Dispatch>

export interface CurryableTypes extends RRCurryableType {}

export interface CurriedType<RootState, Dispatch>
  extends RRCurriedType<RootState, Dispatch> {}
