declare module '*.gif' {
  const logo: number
  export default logo
}

declare module 'react-native/Libraries/Core/Devtools/openURLInBrowser' {
  export default function openURLInBrowser(url: string): void
}
