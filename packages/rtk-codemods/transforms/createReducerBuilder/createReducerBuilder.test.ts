import path from 'path';
import transform, { parser } from './index';

import { runTransformTest } from '../../transformTestUtils';

runTransformTest(
  'createReducerBuilder',
  transform,
  parser,
  path.join(__dirname, '__testfixtures__')
);
