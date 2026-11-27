const withTags = api.enhanceEndpoints({
  addTagTypes: ['tag1', 'tag2']
})

const mutation2 = 'mutation2'

const withPartials = withTags.enhanceEndpoints({
  endpoints: {
    query1: {
      providesTags: ['tag1']
    },
    mutation1(definition) {
      definition.invalidatesTags = ['tag1']
    },
    [mutation2]: (definition) => {},
    'query-2': {
      keepUnusedDataFor: 5
    }
  }
})

const tags = ['tag1']

const withBoth = api.enhanceEndpoints({
  addTagTypes: tags,
  endpoints: {
    ['query1']: {
      providesTags: ['tag1']
    }
  }
})

const addTagTypes = tags

const chained = api
  .enhanceEndpoints({
    addTagTypes
  })
  .injectEndpoints({
    endpoints: () => ({})
  })

const nested = api
  .enhanceEndpoints({ addTagTypes: ['tag1'] })
  .enhanceEndpoints({ endpoints: { query1: { providesTags: ['tag1'] } } })

const fromMember = api.enhanceEndpoints({
  addTagTypes: config.tags,
  endpoints: { query1: { providesTags: ['tag1'] } }
})

const expressionCallbacks = api.enhanceEndpoints({
  endpoints: {
    query1: (definition) => (definition.providesTags = ['tag1']),
    query2: (definition) => definition.extraOptions.tags.push('tag1'),
    mutation1: (definition) => ({ invalidatesTags: ['tag1'] })
  }
})

// Left unchanged: shapes that cannot be converted safely
const dynamicEndpoints = api.enhanceEndpoints({
  endpoints: getEndpointEnhancements()
})

const spreadEndpoints = api.enhanceEndpoints({
  endpoints: { ...enhancements, query1: { providesTags: ['tag1'] } }
})

const spreadOptions = api.enhanceEndpoints({ ...options })

const optionsVariable = api.enhanceEndpoints(options)
