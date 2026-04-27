import Razorpay from "razorpay";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, currency = "INR" } = req.body;
    
    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 paise (1 INR)" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    });

    const options = {
      amount: amount, // amount in the smallest currency unit
      currency: currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error: any) {
    console.error("Razorpay order creation error FULL:", error);
    const errorMessage = error.description || error.message || "Unknown Razorpay Error";
    res.status(500).json({ error: `Razorpay Error: ${errorMessage}` });
  }
}
