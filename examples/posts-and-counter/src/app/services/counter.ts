import { createApi } from "@rtk-incubator/simple-query/dist";

interface CountResponse {
  count: number;
}

interface QueryArg {
  queryString: string;
  method?: string;
  body?: string;
  headers?: any;
}

export const counterApi = createApi({
  reducerPath: "counterApi",
  baseQuery({
    queryString = "",
    method = "GET",
    body,
    headers = {
      "Content-Type": "application/json"
    }
  }: QueryArg) {
    return fetch(`/${queryString}`, { method, body, headers }).then((res) =>
      res.json()
    );
  },
  entityTypes: ["Counter"], // used for invalidation
  endpoints: (build) => ({
    getCount: build.query<CountResponse, void>({
      query() {
        return {
          queryString: `count`
        };
      },
      provides: [{ type: "Counter" }] // this provides entities of the type X - if you use a mutation that impacts this entity it will refetch
    }),
    incrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          queryString: `increment`,
          method: "PUT",
          body: JSON.stringify({ amount })
        };
      },
      invalidates: [{ type: "Counter" }]
    }),
    decrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          queryString: `decrement`,
          method: "PUT",
          body: JSON.stringify({ amount })
        };
      },
      invalidates: [{ type: "Counter" }]
    })
  })
});
