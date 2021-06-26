import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import App from '../App'
import { setUpStore } from '../store'

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
      <Provider store={setUpStore()}>
        <App />
      </Provider>
    )

    screen.getByText('Loading...')

    await screen.findByRole('heading', { name: /bulbasaur/i })

    const img = screen.getByRole('img', {
      name: /bulbasaur/i,
    }) as HTMLImageElement

    expect(img.src).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png'
    )
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
      <Provider store={setUpStore()}>
        <App />
      </Provider>
    )

    screen.getByText('Loading...')

    await screen.findByText('Oh no, there was an error')
  })
})
