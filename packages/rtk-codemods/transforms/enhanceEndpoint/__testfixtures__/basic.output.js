const withTags = api.addTagTypes('tag1', 'tag2')

const mutation2 = 'mutation2'

const withPartials = withTags.enhanceEndpoint('query1', {
  providesTags: ['tag1']
}).enhanceEndpoint('mutation1', (definition) => {
  definition.invalidatesTags = ['tag1']
}).enhanceEndpoint(mutation2, (definition) => {}).enhanceEndpoint('query-2', {
  keepUnusedDataFor: 5
})

const tags = ['tag1']

const withBoth = api.addTagTypes(...tags).enhanceEndpoint('query1', {
  providesTags: ['tag1']
})

const addTagTypes = tags

const chained = api.addTagTypes(...addTagTypes)
  .injectEndpoints({
    endpoints: () => ({})
  })

const nested = api.addTagTypes('tag1').enhanceEndpoint('query1', { providesTags: ['tag1'] })

const fromMember = api.addTagTypes(...config.tags).enhanceEndpoint('query1', { providesTags: ['tag1'] })

const expressionCallbacks = api.enhanceEndpoint('query1', (definition) => {
  definition.providesTags = ['tag1'];
}).enhanceEndpoint('query2', (definition) => {
  definition.extraOptions.tags.push('tag1');
}).enhanceEndpoint('mutation1', (definition) => ({ invalidatesTags: ['tag1'] }))

// Left unchanged: shapes that cannot be converted safely
const dynamicEndpoints = api.enhanceEndpoints({
  endpoints: getEndpointEnhancements()
})

const spreadEndpoints = api.enhanceEndpoints({
  endpoints: { ...enhancements, query1: { providesTags: ['tag1'] } }
})

const spreadOptions = api.enhanceEndpoints({ ...options })

const optionsVariable = api.enhanceEndpoints(options)
