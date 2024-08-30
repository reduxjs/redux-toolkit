import hooksModule = require('../../app/hooks.js')
import pollingSliceModule = require('./pollingSlice.js')

import type { ReactNode } from 'react'

import useAppDispatch = hooksModule.useAppDispatch
import useAppSelector = hooksModule.useAppSelector
import selectGlobalPollingEnabled = pollingSliceModule.selectGlobalPollingEnabled
import selectPollingConfigByApp = pollingSliceModule.selectPollingConfigByApp
import toggleGlobalPolling = pollingSliceModule.toggleGlobalPolling
import updatePolling = pollingSliceModule.updatePolling

const PollingToggleButton = ({
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

const PollingToggles = () => {
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

export = { PollingToggleButton, PollingToggles }
