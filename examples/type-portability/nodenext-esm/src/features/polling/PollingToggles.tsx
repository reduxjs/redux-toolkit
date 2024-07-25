import type { ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks.js'
import {
  selectGlobalPollingEnabled,
  selectPollingConfigByApp,
  toggleGlobalPolling,
  updatePolling,
} from './pollingSlice.js'

export const PollingToggleButton = ({
  enabled,
  onClick,
  children,
}: {
  onClick: () => void
  enabled: boolean
  children?: ReactNode
}) => {
  return (
    <button
      onClick={onClick}
      style={enabled ? { background: 'lightgreen' } : {}}
    >
      {children}
    </button>
  )
}

export const PollingToggles = () => {
  const dispatch = useAppDispatch()
  const globalPolling = useAppSelector(selectGlobalPollingEnabled)
  const timesPolling = useAppSelector((state) =>
    selectPollingConfigByApp(state, 'times'),
  )

  return (
    <div>
      <small>Global Polling Configs</small>
      <div>
        <PollingToggleButton
          enabled={globalPolling}
          onClick={() => dispatch(toggleGlobalPolling())}
        >
          Global
        </PollingToggleButton>
        <PollingToggleButton
          enabled={timesPolling.enabled}
          onClick={() =>
            dispatch(
              updatePolling({ app: 'times', enabled: !timesPolling.enabled }),
            )
          }
        >
          Times
        </PollingToggleButton>
      </div>
    </div>
  )
}
