// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { gql, HttpLink, useMutation } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
} from "@apollo/client";
import { v5 as uuid } from "uuid";
import { NAMESPACE_UUID } from "../../consts";
import JSONBig from "json-bigint";

// Define mutation
const ADD_PROJECT = gql`
  mutation AddProject($name: String, $patch_id: String) {
    insert_project(
      objects: { name: $name, patch_id: $patch_id }
      on_conflict: { constraint: projects_name_key, update_columns: [name] }
    ) {
      returning {
        id
      }
    }
  }
`;

const ADD_PURCHASE = gql`
  mutation AddPurchase(
    $id: uuid
    $mass_g: Int
    $registry_url: String
    $project_id: uuid
  ) {
    insert_purchase(
      objects: {
        id: $id
        mass_g: $mass_g
        registry_url: $registry_url
        project_id: $project_id
      }
    ) {
      returning {
        id
      }
    }
  }
`;

const authToken = process.env.HASURA_ADMIN_SECRET;

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
        "x-hasura-admin-secret": authToken,
      },
    }),
    cache: new InMemoryCache(),
  });

  /*
  if (req.method != "POST") {
    res.status(405).json({ err: "only post allowed" });
  } else {
    createPatchOrder(quantity).then((data) => res.status(200).json(data));
  }
  */

  const order = await createPatchOrder(quantity);

  const projectAdd = await client.mutate({
    mutation: ADD_PROJECT,
    variables: {
      name: order.data.inventory[0].project.name,
      patch_id: order.data.inventory[0].project.id,
    },
  });

  const purchaseAdd = await client.mutate({
    mutation: ADD_PURCHASE,
    variables: {
      id,
      mass_g: order.data.mass_g,
      registry_url: order.data.registry_url,
      project_id: projectAdd.data.insert_project.returning[0].id,
    },
  });

  const purchaseId = purchaseAdd.data.insert_purchase.returning[0].id;
  res.status(201).send(
    JSONBig.stringify({
      success: true,
      data: {
        id: Number(`0x${purchaseId.replace(/-/g, "")}`),
      },
    })
  );
}

const Patch = require("@patch-technology/patch").default;
const patch = Patch(process.env.PATCH_API_KEY);

let createPatchOrder = async (_totalPrice) => {
  try {
    const totalPrice = _totalPrice; // Pass in the total price in smallest currency unit (ie cents for USD)
    const currency = "USD";
    const order = await patch.orders.createOrder({
      total_price: totalPrice,
      currency: currency,
    });
    return order;
  } catch (err) {
    console.log(err);
  }
};
// module.exports = createPatchOrder;
