import path from 'node:path'
import { runTransformTest } from '../../transformTestUtils'
import transform, { parser } from './index'

runTransformTest(
  'createReducerBuilder',
  transform,
  parser,
  path.join(__dirname, '__testfixtures__')
)
