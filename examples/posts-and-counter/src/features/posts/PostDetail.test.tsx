import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { waitFor } from '@testing-library/react';
import { setupTests } from '../../mocks/setupTests';
import { PostDetail } from './PostDetail';

const { renderWithProvider, serverState } = setupTests();

test('loads a post', async () => {
  const { getByRole, findByRole } = renderWithProvider(<PostDetail />, { route: '/posts/1', path: '/posts/:id' });

  const { name } = serverState.entities[serverState.ids[0]] || {};

  const postTitle = await findByRole('heading', { name });

  const editButton = getByRole('button', { name: /Edit/ });
  const deleteButton = getByRole('button', { name: /Delete/ });
});
