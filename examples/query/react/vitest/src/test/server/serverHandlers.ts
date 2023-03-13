import { rest } from "msw";

const handlers = [
  rest.get("https://pokeapi.co/api/v2/pokemon/bulbasaur", (req, res, ctx) => {
    const mockApiResponse = {
      species: {
        name: "bulbasaur",
      },
      sprites: {
        front_shiny:
          "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png",
      },
    };
    return res(ctx.json(mockApiResponse));
  }),
];

export { handlers };
