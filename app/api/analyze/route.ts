import { NextRequest, NextResponse } from "next/server";
import { fetchQuote, fetchHistoricalData } from "@/lib/market-data";
import { calculateRSI, calculateSMA } from "@/lib/indicators";
import { generateStockAnalysis } from "@/lib/ai-service";
import { cache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();

  const cacheKey = `analysis_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const [quote, history] = await Promise.all([
      fetchQuote(symbol),
      fetchHistoricalData(symbol, 90),
    ]);

    const rsiList = calculateRSI(history, 14);
    const sma50List = calculateSMA(history, 50);

    const latestRSI = rsiList.length > 0 ? rsiList[rsiList.length - 1].value : 50;
    const latestSMA50 = sma50List.length > 0 ? sma50List[sma50List.length - 1].value : quote.price;

    const analysis = await generateStockAnalysis(quote, history, latestRSI, latestSMA50);
    cache.set(cacheKey, analysis, 60); // 1 minute TTL to stay live yet cost-efficient

    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Failed to generate AI analysis" }, { status: 500 });
  }
}