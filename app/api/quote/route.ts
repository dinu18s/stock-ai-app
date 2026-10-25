import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/market-data";
import { cache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local_client";
  if (cache.isRateLimited(ip, 120, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();

  try {
    const quote = await fetchQuote(symbol);
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}