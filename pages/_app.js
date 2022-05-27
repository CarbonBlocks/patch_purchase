import "../styles/globals.css";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  gql,
} from "@apollo/client";
import { useMemo } from "react";
import { GRAPHQL_URL } from "../consts";

function MyApp({ Component, pageProps }) {
  const client = useMemo(
    () =>
      new ApolloClient({
        uri: GRAPHQL_URL,
        cache: new InMemoryCache(),
      }),
    []
  );
  return (
    <ApolloProvider {...{ client }}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}

export default MyApp;
