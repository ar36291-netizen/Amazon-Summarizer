import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ApifyClient } from 'apify-client';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Apify client lazily
let apifyClient: ApifyClient | null = null;
function getApifyClient() {
  if (!apifyClient) {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
      throw new Error('APIFY_TOKEN environment variable is required for scraping');
    }
    apifyClient = new ApifyClient({ token });
  }
  return apifyClient;
}

// Initialize Gemini lazily
let genAI: GoogleGenAI | null = null;
function getGemini() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required for analysis');
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

const SYSTEM_PROMPT = `
# AMAZON REVIEW INTELLIGENCE ANALYST — SYSTEM PROMPT v3

## ROLE & IDENTITY
You are an Amazon Review Intelligence Analyst. You accept Amazon product reviews and deliver consumer intelligence.

## OUTPUT FORMAT
Deliver output in this EXACT sequence every time:

1. SHORT SUMMARY (always first)
Start with the header: ### SHORT SUMMARY
Write exactly 2 to 3 sentences of plain prose below the header.
FORMAT RULES:
- Write in third person: "Customers find..." / "Buyers report..."
- Sentence 1: Lead with the dominant positive sentiment.
- Sentence 2: Address the main mixed or negative aspect.
- Sentence 3 (optional): Note any standout feature or split opinion.
- Each sentence must be 80 characters or fewer.

2. FULL STRUCTURED REPORT (always follows the summary)
Deliver in this exact section order:

---
# PRODUCT REVIEW INTELLIGENCE REPORT
## PRODUCT SNAPSHOT
## RATING OVERVIEW
## DATA QUALITY SIGNALS
## WHAT BUYERS LOVE — TOP 5 POSITIVE THEMES
## WHAT BUYERS COMPLAIN ABOUT — TOP 5 NEGATIVE THEMES
## DIVIDED OPINIONS — NUANCED THEMES
## FEATURE SCORECARD
## BUYER PROFILE INSIGHTS
## COMPETITIVE SIGNALS
## OVERALL VERDICT (3-5 sentences, max 80 chars per line)
## CONFIDENCE IN THIS ANALYSIS: [High / Medium / Low]

---
## GUARDRAILS CHECKLIST
(List all checked [x] or flagged [!] as defined in instructions)

## OUTPUT LINE LENGTH RULE (MANDATORY)
Every single line of output must be 80 characters or fewer.
`;

// ASIN Extraction helper
function extractAsin(input: string): { asin: string | null; marketplace: string } {
  const trimmed = input.trim();
  
  // Try to find the domain first
  const domainMatch = trimmed.match(/amazon\.([a-z.]+)/);
  const marketplace = domainMatch ? `amazon.${domainMatch[1]}` : 'amazon.in';

  // ASINs are 10-character alphanumeric
  // Check common URL patterns: /dp/ASIN, /gp/product/ASIN, /product/ASIN
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/product\/([A-Z0-9]{10})/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { asin: match[1], marketplace };
    }
  }
  
  // Check if the input itself is a raw ASIN
  if (/^[A-Z0-9]{10}$/.test(trimmed)) {
    return { asin: trimmed, marketplace };
  }
  
  return { asin: null, marketplace };
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

app.post("/api/analyze", async (req, res) => {
  const { reviews, asin, marketplace } = req.body;

  if (!reviews || !Array.isArray(reviews)) {
    return res.status(400).json({ error: "Reviews data is required for analysis" });
  }

  try {
    const ai = getGemini();
    const prompt = `
        ANALYSIS REQUEST:
        ASIN: ${asin || 'N/A'}
        Marketplace: ${marketplace || 'amazon.in'}
        Reviews: ${JSON.stringify(reviews)}
        
        Analyze the above reviews according to your system instructions.
        Ensure every line of your output is 80 characters or fewer.
      `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      config: { systemInstruction: SYSTEM_PROMPT },
      contents: prompt
    });
    
    res.json({ report: response.text });
  } catch (error: any) {
    console.error("[SERVER ERROR] Analysis failure:", error);
    res.status(500).json({ error: error.message || "Failed to analyze reviews" });
  }
});

app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  console.log(`[API] Received scrape request for: ${url}`);
  
  if (!url) {
    return res.status(400).json({ error: "URL or ASIN is required" });
  }

  const { asin, marketplace } = extractAsin(url);
  console.log(`[ANALYSIS] Extracted ASIN: ${asin}, Marketplace: ${marketplace}`);
  
  if (!asin) {
    return res.status(400).json({ error: "Invalid Amazon URL or ASIN. Please provide a full product URL or 10-char ASIN." });
  }

  try {
    const client = getApifyClient();
    
    const input = {
      products: [`https://www.${marketplace}/dp/${asin}`],
      region: marketplace,
      limit: 10,
      sort: "helpful",
      rating: "all",
      personal_data: false,
      include_variants: false, // Disabling for speed
    };

    console.log(`[APIFY] Starting actor run...`);
    const run = await client.actor("web_wanderer/amazon-reviews-extractor").call(input);
    console.log(`[APIFY] Run finished. Dataset: ${run.defaultDatasetId}`);
    
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`[APIFY] Scraped ${items.length} reviews.`);
    
    res.json({
      asin,
      marketplace,
      reviews: items,
      count: items.length
    });
  } catch (error: any) {
    console.error("[SERVER ERROR] Scraping failure:", error);
    res.status(500).json({ 
      error: error.message || "Failed to scrape reviews"
    });
  }
});

// Global error handler for uncaught exceptions in routes
app.use((err: any, req: any, res: any, next: any) => {
  console.error("[FATAL ERROR]", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

export default app;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server locally, not on Vercel
if (process.env.VERCEL !== "1") {
  startServer();
}
