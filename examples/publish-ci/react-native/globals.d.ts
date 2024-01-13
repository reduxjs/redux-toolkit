declare module "*.gif" {
  const logo: number
  export default logo
}

declare module "react-native/Libraries/NewAppScreen" {
  import type { FC } from "react"
  export const HermesBadge: FC
}

declare module "react-native/Libraries/Core/Devtools/openURLInBrowser" {
  export default function openURLInBrowser(url: string): void
}
