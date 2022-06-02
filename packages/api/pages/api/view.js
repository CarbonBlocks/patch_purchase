import { ApolloClient, gql, HttpLink, InMemoryCache } from "@apollo/client";
import { v5 as uuid } from "uuid";
import { NAMESPACE_UUID } from "../../consts";

const FIND_PURCHASE = gql`
  query FindPurchase($id: uuid) {
    purchase(where: { id: { _eq: $id } }) {
      mass_g
    }
  }
`;
export default async function handler(req, res) {
  const { quantity = 100, block } = req.query;

  if (!block) {
    throw new Error("must set block");
  }
  const id = uuid(block, NAMESPACE_UUID);

  const client = new ApolloClient({
    link: new HttpLink({
      uri: process.env.GRAPHQL_URL,
      headers: {
        "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
      },
    }),
    cache: new InMemoryCache(),
  });
  console.log({ id });
  const response = await client.query({
    query: FIND_PURCHASE,
    variables: {
      id,
    },
  });
  console.log(JSON.stringify(response));
  res.status(200).json({
    success: true,
    data: {
      mass_g: response.data.purchase[0].mass_g,
      ipfs_hash: 33,
    },
  });
}
