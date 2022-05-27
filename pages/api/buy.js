import { Web3Storage, Blob, File } from "web3.storage";
import Patch from "@patch-technology/patch";

const patch = Patch(process.env.PATCH_API_KEY);

export default async function handler(req, res) {
  const { price } = req.query;
  if (!price) {
    throw new Error("must set price");
  }

  /*
  if (req.method != "POST") {
    res.status(405).json({ err: "only post allowed" });
  } else {
    createPatchOrder(quantity).then((data) => res.status(200).json(data));
  }
  */

  const order = await createPatchOrder(price);

  const project = order.data.inventory.shift().project.name;
  const { mass_g, registry_url } = order.data;
  const metadata = {
    name: `${mass_g}g of ${project}`,
    image:
      "ipfs://bafybeiaiezebtrtxvpyqtbalq2t4j7d3zivqu2ptc6hk42uwbf7cnblsqu/snap2022-02-26-03-00-49.png",
    animation_url: registry_url,
  };
  // console.log({ metadata });
  const storage = new Web3Storage({ token: process.env.STORAGE_API_KEY });
  const blob = new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  });
  const cid = await storage.put([new File([blob], "metadata.json")]);
  res.status(201).json({
    success: true,
    data: {
      mass_g: order.data.mass_g,
      token_uri: `ipfs://${cid}/metadata.json`,
      project,
    },
  });
}

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
