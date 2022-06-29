import type { ComponentProps } from 'react'
import React from 'react'
import Main from '@theme-original/DocPage/Layout/Main'
import type MainType from '@theme-original/DocPage/Layout/Main'
import BraveWarning from './BraveWarning'

type Props = ComponentProps<typeof MainType>

export default function MainWrapper(props: Props): JSX.Element {
  return (
    <>
      <Main {...props}>
        <BraveWarning />
        {props.children}
      </Main>
    </>
  )
}
