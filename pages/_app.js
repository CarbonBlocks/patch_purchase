import "../styles/globals.css";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  gql,
} from "@apollo/client";

function MyApp({ Component, pageProps }) {
  const client = useMemo(
    new ApolloClient({
      uri: "https://patch-purchase.hasura.app/v1/graphql",
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
