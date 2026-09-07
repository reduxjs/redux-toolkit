import * as React from 'react'
import { useEffect } from 'react'
import { timeApi } from '../../app-core/services/times'
import { useAppDispatch } from '../../app-core/hooks'

export const TimeDisplay = ({
  offset,
  label,
}: {
  offset: string
  label: string
}) => {
  const [data, setData] = React.useState<any>(null)
  const dispatch = useAppDispatch()

  useEffect(() => {
    const res = dispatch(timeApi.endpoints.getTime.initiate(offset))

    res.then((value) => {
      setData(value?.data)
    })
    return res.unsubscribe
  }, [offset, dispatch])

  return (
    <div>
      <h2>Time Zone</h2>
      <ul style={{ textAlign: 'left' }}>
        <li>Zone: {label}</li>
        <li>
          Time:{' '}
          <span data-testid="time-value">
            {data?.time ? new Date(data.time).toLocaleTimeString() : 'unknown'}
          </span>
        </li>
      </ul>
    </div>
  )
}
