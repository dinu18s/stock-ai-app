import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalData } from "@/lib/market-data";
import { calculateSMA, calculateRSI, calculateMACD } from "@/lib/indicators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();
  const days = parseInt(searchParams.get("days") || "180", 10);

  try {
    const history = await fetchHistoricalData(symbol, days);
    const sma20 = calculateSMA(history, 20);
    const sma50 = calculateSMA(history, 50);
    const rsi = calculateRSI(history, 14);
    const macd = calculateMACD(history);

    return NextResponse.json({
      candles: history,
      overlays: {
        sma20,
        sma50,
        rsi,
        macd,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to compute indicators" }, { status: 500 });
  }
}