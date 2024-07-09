import type { FC, ReactNode } from 'react'

const Container: FC<{ children: ReactNode }> = ({ children }) => (
  <div style={{ textAlign: 'center', padding: 50, margin: '0 auto' }}>
    {children}
  </div>
)

export = Container
