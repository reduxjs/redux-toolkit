import * as React from "react";
import { useGetPokemonByNameQuery } from "./services/pokemon";

export const Pokemon = ({ name }: { name: string }) => {
  const { data, error, isFetching, refetch } = useGetPokemonByNameQuery(name);

  return (
    <div style={{ float: "left", textAlign: "center" }}>
      {error ? (
        <>Oh no, there was an error</>
      ) : !data ? (
        <>Loading...</>
      ) : (
        <>
          <h3>{data.species.name}</h3>
          <div>
            <img src={data.sprites.front_shiny} alt={data.species.name} />
          </div>
          <div>
            <button onClick={refetch} disabled={isFetching}>
              {isFetching ? "Loading..." : "Refetch"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
