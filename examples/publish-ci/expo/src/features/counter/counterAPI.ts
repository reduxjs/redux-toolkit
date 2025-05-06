// A mock function to mimic making an async request for data
export const fetchCount = (amount = 1): Promise<{ data: number }> =>
  new Promise<{ data: number }>(resolve =>
    setTimeout(() => {
      resolve({ data: amount })
    }, 500),
  )
