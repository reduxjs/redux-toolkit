import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import App from '../App'
import { createStore } from '../store'

const server = setupServer(
  rest.get('https://pokeapi.co/api/v2/pokemon/bulbasaur', (req, res, ctx) => {
    const mockApiResponse = {
      species: {
        name: 'bulbasaur',
      },
      sprites: {
        front_shiny:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png',
      },
    }
    return res(ctx.json(mockApiResponse))
  })
)

describe('App', () => {
  beforeAll(() => server.listen())

  afterEach(() => server.resetHandlers())

  afterAll(() => server.close())

  it('handles good response', async () => {
    render(
      <Provider store={createStore()}>
        <App />
      </Provider>
    )

    await screen.getByText('Loading...')

    await waitFor(() => {
      screen.getByText('bulbasaur')

      const img = screen.getByAltText('bulbasaur') as HTMLImageElement
      expect(img.src).toBe(
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png'
      )
    })
  })

  it('handles error response', async () => {
    // force msw to return error response
    server.use(
      rest.get(
        'https://pokeapi.co/api/v2/pokemon/bulbasaur',
        (req, res, ctx) => {
          return res(ctx.status(500))
        }
      )
    )

    render(
      <Provider store={createStore()}>
        <App />
      </Provider>
    )

    await waitFor(() => {
      screen.getByText('Loading...')
    })

    await waitFor(() => {
      screen.getByText('Oh no, there was an error')
    })
  })
})
