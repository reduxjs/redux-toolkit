import * as React from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { Container } from '../common/Container';
import { Counter } from './Counter';

export const CounterList = () => {
  const [counters, setCounters] = React.useState<string[]>([]);

  if (!counters.length) {
    return (
      <Container>
        <div>No counters, why don't you add one?</div>
        <div>
          <button onClick={() => setCounters((prev) => [...prev, nanoid()])}>Add counter</button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div>
        <button onClick={() => setCounters((prev) => [...prev, nanoid()])}>Add counter</button>
      </div>
      {counters.map((id) => (
        <Counter key={id} id={id} onRemove={() => setCounters((prev) => prev.filter((el) => el !== id))} />
      ))}
    </Container>
  );
};
