import { nanoid } from '@reduxjs/toolkit';
import React, { useState } from 'react';
import { Counter } from './Counter';

const Container: React.FC = ({ children }) => (
  <div style={{ textAlign: 'center', padding: 50, margin: '0 auto' }}>{children}</div>
);
export const CounterList = () => {
  const [counters, setCounters] = useState<string[]>([]);

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
