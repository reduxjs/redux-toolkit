import { coreModule } from '../core/module';
import { buildCreateApi } from '../createApi';
import { reactHooksModule } from './module';

const createApi = buildCreateApi(coreModule(), reactHooksModule());

export { createApi, reactHooksModule };
