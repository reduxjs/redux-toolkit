import type { ReactNode } from "react"
import styles from "./Tab.module.css"
import clsx from "clsx"

export function Tab({
  children,
  selected,
  onClick,
}: {
  children: ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={clsx(styles.tab, selected && styles.selected)}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
