import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { setupTests } from '../../mocks/setupTests';
import PostsManager from './PostsManager';

const { renderWithProvider, serverState } = setupTests();

test('allows you to add a new post and have it show in both PostList components', async () => {
  const { getByPlaceholderText, getByRole, getAllByRole, queryAllByText } = renderWithProvider(<PostsManager />);
  const addPostButton = getByRole('button', { name: /Add Post/ });
  const nameInput = getByPlaceholderText('New post name');

  const newPostName = `I am a new post!`;

  fireEvent.change(nameInput, { target: { value: newPostName } });
  expect(nameInput).toHaveValue(newPostName);

  fireEvent.click(addPostButton);

  // name input clears on success submit and is no longer loading
  await waitFor(() => {
    expect(nameInput).toHaveValue('');
  });
  await waitForElementToBeRemoved(() => queryAllByText('Loading'));

  // Make sure the post is displayed in both <PostList /> components
  expect(getAllByRole('listitem').filter((listitem) => listitem.textContent === newPostName).length).toEqual(2);
});

test('allows you to select a post and load it', async () => {
  const { getByRole, getAllByRole } = renderWithProvider(<PostsManager />);

  const { name } = serverState.entities[serverState.ids[0]] || {};

  const postLink = getAllByRole('link', { name });
  fireEvent.click(postLink[0]);

  await waitFor(() => expect(getByRole('heading', { name })).toBeInTheDocument());
});

// test delete

// test update behavior
