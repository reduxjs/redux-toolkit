import ReduxToolkit = require('@reduxjs/toolkit')
import React = require('react')
import ContainerModule = require('../common/Container.js')
import CounterModule = require('./Counter.js')

import nanoid = ReduxToolkit.nanoid
import useState = React.useState

const { Container } = ContainerModule
const { Counter } = CounterModule

const CounterList = () => {
  const [counters, setCounters] = useState<string[]>([])

  if (!counters.length) {
    return (
      <Container>
        <div>No counters, why don't you add one?</div>
        <div>
          <button onClick={() => setCounters((prev) => [...prev, nanoid()])}>
            Add counter
          </button>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div>
        <button onClick={() => setCounters((prev) => [...prev, nanoid()])}>
          Add counter
        </button>
      </div>
      {counters.map((id) => (
        <Counter
          key={id}
          id={id}
          onRemove={() => setCounters((prev) => prev.filter((el) => el !== id))}
        />
      ))}
    </Container>
  )
}

export = { CounterList }
