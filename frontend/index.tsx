import { initializeBlock } from "@airtable/blocks/ui";
import GraphiQL from "graphiql";
import "graphiql/graphiql.min.css";
import React from "react";

function HelloWorldTypescriptBlock() {
  // YOUR CODE GOES HERE
  const URL = "https://swapi-graphql.netlify.com/.netlify/functions/index";

  function graphQLFetcher(graphQLParams: any) {
    return fetch(URL, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphQLParams),
    }).then((response) => response.json());
  }

  const defaultQuery = `
    {
    allFilms {
        edges {
        node {
            id
            title
            producers
            episodeID
            created
        }
        }
    }
    }
    `;

  //   const container = document.getElementById("graphiql");

  return (
    <div>
      <div>Hello world 🚀</div>
      <GraphiQL fetcher={graphQLFetcher} defaultQuery={defaultQuery} />,
    </div>
  );
}

initializeBlock(() => <HelloWorldTypescriptBlock />);
