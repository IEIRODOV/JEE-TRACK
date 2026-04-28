import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
let genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.Gemini_API_Key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured in environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
  });

  // API Routes
  app.post("/api/solve-doubt", async (req, res) => {
    try {
      const { prompt, image, subject } = req.body;
      const ai = getGenAI();

      const parts: any[] = [];
      const systemContext = `Subject: ${subject}\nTask: Solve this doubt step-by-step with clear explanations and LaTeX formatting for formulas.`;
      
      if (prompt) {
        parts.push({ text: `${systemContext}\n\nUser Question: ${prompt}` });
      } else {
        parts.push({ text: systemContext });
      }

      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: { parts }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI response" });
    }
  });

  app.post("/api/create-order", async (req, res) => {
    try {
      const { amount, currency = "INR" } = req.body;
      
      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Amount must be at least 100 paise (1 INR)" });
      }

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
  });

  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing required payment fields" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        res.json({ success: true, message: "Payment verified successfully" });
      } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
