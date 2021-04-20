import { buildCreateApi } from '../createApi';
import { coreModule } from './module';

const createApi = buildCreateApi(coreModule());

export { createApi, coreModule };
