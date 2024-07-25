import { nanoid } from '@reduxjs/toolkit'
import { useState } from 'react'
import { Container } from '../common/Container.js'
import { Counter } from './Counter.js'

export const CounterList = () => {
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
