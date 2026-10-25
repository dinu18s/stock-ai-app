import { StockQuote } from "./market-data";
import { Bar } from "./indicators";

export interface AIAnalysisResult {
  summary: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  sentimentScore: number; // 0 - 100
  fundamentals: {
    peRating: string;
    marketCapContext: string;
    strengths: string[];
  };
  technicals: {
    rsiStatus: string;
    trendAnalysis: string;
    supportLevel: number;
    resistanceLevel: number;
  };
  risks: string[];
  catalysts: string[];
}

export async function generateStockAnalysis(
  quote: StockQuote,
  history: Bar[],
  rsi: number,
  sma50: number
): Promise<AIAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const currentPrice = quote.price;

  if (apiKey && process.env.FORCE_MOCK_DATA !== "true") {
    try {
      const prompt = `
Analyze the asset ${quote.symbol} (${quote.name}).
Current Market Data:
- Price: $${quote.price} (Change: ${quote.change} / ${quote.percentChange}%)
- P/E Ratio: ${quote.peRatio}
- 52-Week Range: $${quote.week52Low} - $${quote.week52High}
- Technical RSI(14): ${rsi}
- 50-period SMA: $${sma50}

Respond ONLY with valid JSON following this exact typescript shape:
{
  "summary": "2-3 sentences overview",
  "sentiment": "Bullish" | "Bearish" | "Neutral",
  "sentimentScore": number between 1 and 99,
  "fundamentals": {
    "peRating": "brief evaluation of valuation",
    "marketCapContext": "category and scale analysis",
    "strengths": ["bullet 1", "bullet 2"]
  },
  "technicals": {
    "rsiStatus": "Oversold | Neutral | Overbought evaluation",
    "trendAnalysis": "price relative to SMA and trend direction",
    "supportLevel": number,
    "resistanceLevel": number
  },
  "risks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"]
}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return JSON.parse(json.choices[0].message.content);
      }
    } catch {
      // Fall through to deterministic heuristics fallback
    }
  }

  // Deterministic financial evaluation fallback
  const isOverbought = rsi > 70;
  const isOversold = rsi < 30;
  const isAboveSMA = currentPrice >= sma50;

  const sentiment: "Bullish" | "Bearish" | "Neutral" =
    isAboveSMA && !isOverbought ? "Bullish" : !isAboveSMA && isOversold ? "Neutral" : isOverbought ? "Bearish" : "Bullish";

  const sentimentScore = sentiment === "Bullish" ? 74 : sentiment === "Bearish" ? 32 : 50;

  return {
    summary: `${quote.name} (${quote.symbol}) is currently trading at $${quote.price}. Technicals display a ${sentiment.toLowerCase()} posture as the price sits ${
      isAboveSMA ? "above" : "below"
    } its medium-term 50-day moving average ($${sma50}).`,
    sentiment,
    sentimentScore,
    fundamentals: {
      peRating: quote.peRatio == null
  ? "Data Unavailable"
  : quote.peRatio > 40
    ? "Premium / High Growth"
    : "Moderate Valuation"
      marketCapContext: `Dominant large-cap tier with a $${quote.marketCap} capitalization.`,
      strengths: ["Strong institutional liquidity profile", "Predictable quarterly revenue generation"],
    },
    technicals: {
      rsiStatus: `RSI is ${rsi.toFixed(1)} (${isOverbought ? "Overbought" : isOversold ? "Oversold" : "Balanced momentum"})`,
      trendAnalysis: `Asset is ${isAboveSMA ? "maintaining bullish structure above" : "testing resistance below"} SMA 50 ($${sma50}).`,
      supportLevel: parseFloat((quote.price * 0.94).toFixed(2)),
      resistanceLevel: parseFloat((quote.price * 1.06).toFixed(2)),
    },
    risks: ["Macro interest rate sensitivity", "Sector-wide multiple compression risk"],
    catalysts: ["Upcoming quarterly earnings release", "Product roadmap expansion"],
  };
}

export async function processScopedChatMessage(
  messages: { role: string; content: string }[],
  contextData: { symbol: string; quote: StockQuote; analysis: AIAnalysisResult }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  const systemPrompt = `
You are an expert AI stock market research assistant embedded in a financial terminal.
Strict Guardrails:
1. ONLY answer questions regarding the current asset (${contextData.symbol} - ${contextData.quote.name}), technical analysis, valuation, market metrics, or macroeconomic impact on this stock.
2. If the user asks about unrelated topics (e.g. general coding, creative writing, cooking, personal advice), decline politely: "I am specifically scoped to analyze stock market data and the technicals for ${contextData.symbol}. Please ask a question related to this asset or the market analysis."
3. Never guarantee profits or provide registered investment advice. State calculations objectively.
4. Ground your insights in the live context provided:
   - Price: $${contextData.quote.price}
   - P/E: ${contextData.quote.peRatio}
   - Technical Sentiment: ${contextData.analysis.sentiment} (Score: ${contextData.analysis.sentimentScore}/100)
   - Support: $${contextData.analysis.technicals.supportLevel} | Resistance: $${contextData.analysis.technicals.resistanceLevel}
   - RSI Status: ${contextData.analysis.technicals.rsiStatus}
`;

  if (apiKey && process.env.FORCE_MOCK_DATA !== "true") {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        return json.choices[0].message.content;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback intelligent agent
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";

  if (lastUserMsg.includes("buy") || lastUserMsg.includes("sell") || lastUserMsg.includes("invest")) {
    return `Regarding ${contextData.symbol}, the technical indicator displays a ${contextData.analysis.sentiment} bias (Score: ${contextData.analysis.sentimentScore}/100). Resistance sits near $${contextData.analysis.technicals.resistanceLevel} and support is anchored at $${contextData.analysis.technicals.supportLevel}. This analysis is for informational purposes only—always review your risk parameters before entering trades.`;
  }

  if (lastUserMsg.includes("rsi") || lastUserMsg.includes("technical") || lastUserMsg.includes("chart")) {
    return `${contextData.symbol}'s current ${contextData.analysis.technicals.rsiStatus}. The key overhead resistance is $${contextData.analysis.technicals.resistanceLevel}, while key downward support is at $${contextData.analysis.technicals.supportLevel}. Trend: ${contextData.analysis.technicals.trendAnalysis}`;
  }

  if (lastUserMsg.includes("pe") || lastUserMsg.includes("valuation") || lastUserMsg.includes("fundamental")) {
    return `${contextData.symbol} is trading with a P/E ratio of ${contextData.quote.peRatio}. Fundamental assessment: ${contextData.analysis.fundamentals.peRating}. Market Capitalization: $${contextData.quote.marketCap}.`;
  }

  return `I have evaluated ${contextData.symbol} based on our latest live feed. The asset is at $${contextData.quote.price} (${contextData.quote.change >= 0 ? "+" : ""}${contextData.quote.change}). Primary catalysts include ${contextData.analysis.catalysts.join(", ")}, with key risks: ${contextData.analysis.risks.join(", ")}. What specific indicator or metric would you like to drill into?`;
}