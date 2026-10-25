import { NextRequest, NextResponse } from "next/server";
import { fetchQuote, fetchHistoricalData } from "@/lib/market-data";
import { calculateRSI, calculateSMA } from "@/lib/indicators";
import { generateStockAnalysis, processScopedChatMessage } from "@/lib/ai-service";
import { cache } from "@/lib/cache";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local_chat";
  if (cache.isRateLimited(`chat_${ip}`, 20, 60000)) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait a minute." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { messages, symbol } = body;

    const sym = (symbol || "AAPL").toUpperCase();
    const [quote, history] = await Promise.all([
      fetchQuote(sym),
      fetchHistoricalData(sym, 60),
    ]);

    const rsiList = calculateRSI(history, 14);
    const sma50List = calculateSMA(history, 50);
    const latestRSI = rsiList.length > 0 ? rsiList[rsiList.length - 1].value : 50;
    const latestSMA50 = sma50List.length > 0 ? sma50List[sma50List.length - 1].value : quote.price;

    const analysis = await generateStockAnalysis(quote, history, latestRSI, latestSMA50);
    const response = await processScopedChatMessage(messages, { symbol: sym, quote, analysis });

    return NextResponse.json({ reply: response });
  } catch {
    return NextResponse.json({ error: "Failed to execute AI chat query" }, { status: 500 });
  }
}