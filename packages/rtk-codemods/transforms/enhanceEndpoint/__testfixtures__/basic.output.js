const withTags = api.addTagTypes('tag1');

const mutation2 = 'mutation2';

const withPartials = withTags.enhanceEndpoint("query1", {
    providesTags: ['tag1']
}).enhanceEndpoint("mutation1", (definition) => {
    definition.invalidatesTags = ['tag1']
}).enhanceEndpoint(mutation2, (definition) => {})

const tags = ['tag1']

const withBoth = api.addTagTypes(...tags).enhanceEndpoint("query1", {
    providesTags: ['tag1']
})

const addTagTypes = tags

const chained = api.addTagTypes(...addTagTypes)
    .injectEndpoints({
        endpoints: () => {}
    })