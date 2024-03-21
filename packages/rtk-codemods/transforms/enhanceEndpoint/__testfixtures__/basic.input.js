const withTags = api.enhanceEndpoints({
    addTagTypes: ['tag1']
});

const mutation2 = 'mutation2';

const withPartials = withTags.enhanceEndpoints({
    endpoints: {
        query1: {
            providesTags: ['tag1']
        },
        mutation1(definition) {
            definition.invalidatesTags = ['tag1']
        },
        [mutation2]: (definition) => {}
    }
})

const tags = ['tag1']

const withBoth = api.enhanceEndpoints({
    addTagTypes: tags,
    endpoints: {
        ["query1"]: {
            providesTags: ['tag1']
        },
    }
})

const addTagTypes = tags

const chained = api
    .enhanceEndpoints({
        addTagTypes
    })
    .injectEndpoints({
        endpoints: () => {}
    })