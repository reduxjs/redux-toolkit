import { ClientApp } from './ClientApp'
import { ServerApiInfo } from './ServerApiInfo'

export default function IndexPage() {
  return (
    <div className="App">
      <header className="App-header">
        <ServerApiInfo />
        <ClientApp />
      </header>
    </div>
  )
}
