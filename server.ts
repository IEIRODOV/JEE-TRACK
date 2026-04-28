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
      throw new Error("Gemini API Key is not configured. Please add Gemini_API_Key to Secrets.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Log all requests to debug 404
  app.use((req, res, next) => {
    console.log(`[Incoming Request] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  
  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error("Global Server Error:", err);
      return res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error",
        type: "GlobalServerError"
      });
    }
    next();
  });

  // API Routes - Registered BEFORE anything else
  app.get("/api/health", (req, res) => {
    const keysPresent = {
      Gemini_API_Key: !!process.env.Gemini_API_Key,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    };
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env_check: keysPresent
    });
  });

  app.post("/api/solve-doubt", async (req, res) => {
    try {
      const { prompt, image, subject } = req.body;
      
      if (!prompt && !image) {
        return res.status(400).json({ error: "Either a prompt or an image is required." });
      }

      const ai = getGenAI();

      const parts: any[] = [];
      const systemContext = `Subject: ${subject || 'General'}\nTask: Solve this doubt step-by-step with clear explanations and LaTeX formatting for formulas.`;
      
      if (prompt) {
        parts.push({ text: `${systemContext}\n\nUser Question: ${prompt}` });
      } else {
        parts.push({ text: systemContext });
      }

      if (image && typeof image === 'string' && image.includes(',')) {
        try {
          const splitImage = image.split(',');
          const base64Data = splitImage[1];
          const mimeType = splitImage[0].split(':')[1].split(';')[0];
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        } catch (imageErr) {
          console.error("Error parsing image data:", imageErr);
          return res.status(400).json({ error: "Invalid image data format." });
        }
      }

      console.log(`Solving doubt for subject: ${subject}`);
      
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: { parts }
      });

      if (!response || !response.text) {
        throw new Error("No response generated from AI.");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      // Ensure we always return JSON
      res.status(500).json({ 
        error: error.message || "Failed to generate AI response",
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
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
