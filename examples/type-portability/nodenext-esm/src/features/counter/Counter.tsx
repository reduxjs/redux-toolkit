import { useState } from 'react'
import {
  useDecrementCountMutation,
  useGetCountQuery,
  useIncrementCountMutation,
} from '../../app/services/counter.js'

export function Counter({
  id,
  onRemove,
}: {
  id?: string
  onRemove?: () => void
}) {
  const [pollingInterval, setPollingInterval] = useState(10_000)
  const { data } = useGetCountQuery(undefined, { pollingInterval })
  const [increment] = useIncrementCountMutation()

  const [decrement] = useDecrementCountMutation()

  return (
    <div>
      <div>
        <button aria-label="Increment value" onClick={() => increment(1)}>
          +
        </button>
        <span>{data?.count || 0}</span>
        <button aria-label="Decrement value" onClick={() => decrement(1)}>
          -
        </button>
        <input
          type="number"
          name="pollingInterval"
          value={pollingInterval}
          onChange={({ target: { valueAsNumber } }) =>
            setPollingInterval(valueAsNumber)
          }
        />
        {onRemove && <button onClick={onRemove}>Remove {id}</button>}
      </div>
    </div>
  )
}
