// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {
  // res.status(200).json({ name: "John Doe" });
  const { quantity } = req.query;
  // console.log(req.method);
  if (req.method != "POST") {
    res.status(405).json({ err: "only post allowed" });
  } else {
    createPatchOrder(quantity).then((data) => res.status(200).json(data));
  }
}
// let order1 = createPatchOrder(500).then((order1) => console.log(order1));

const Patch = require("@patch-technology/patch").default;
const patch = Patch("key_test_930d8522c0ec35c847efdb06f0b64dc7");

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
