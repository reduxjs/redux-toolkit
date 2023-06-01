import { api } from './emptyApi';
export const addTagTypes = [] as const;
const injectedRtkApi = api.addTagTypes(...addTagTypes).injectEndpoints({
  endpoints: (build) => ({}),
  overrideExisting: false,
});
export { injectedRtkApi as enhancedApi };
export const {} = injectedRtkApi;
