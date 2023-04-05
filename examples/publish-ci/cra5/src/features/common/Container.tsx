import { FC, ReactNode } from 'react'

export const Container: FC<{ children: ReactNode }> = ({ children }) => (
  <div style={{ textAlign: 'center', padding: 50, margin: '0 auto' }}>
    {children}
  </div>
)
