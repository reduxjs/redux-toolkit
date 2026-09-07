'use client'

import { Counter } from '../features/counter/Counter'
import { Post } from '../features/posts/Post'
import { TimeDisplay } from '../features/time/TimeList'
import { MswProvider } from './MswProvider'
import { StoreProvider } from './StoreProvider'

export function ClientApp() {
  return (
    <StoreProvider>
      <MswProvider>
        <Counter />
        <TimeDisplay
          label="(GMT -5:00) Eastern Time (US & Canada), Bogota, Lima"
          offset="-5:00"
        />
        <Post id={1} />
      </MswProvider>
    </StoreProvider>
  )
}
