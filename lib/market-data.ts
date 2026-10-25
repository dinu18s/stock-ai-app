
import type { Bar } from "./indicators";
import { cache } from "./cache";

export type MarketDataSource = "alpha-vantage" | "demo";

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  peRatio: number | null;
  marketCap: string | null;
  week52High: number | null;
  week52Low: number | null;
  source: MarketDataSource;
  isDemo: boolean;
  lastUpdated: string;
}

const SYMBOL_DIRECTORY: Record<
  string,
  { name: string; basePrice: number }
> = {
  AAPL: { name: "Apple Inc.", basePrice: 232.5 },
  TSLA: { name: "Tesla, Inc.", basePrice: 218 },
  NVDA: { name: "NVIDIA Corporation", basePrice: 138.2 },
  SPY: { name: "SPDR S&P 500 ETF Trust", basePrice: 580.4 },
  VOO: { name: "Vanguard S&P 500 ETF", basePrice: 532.1 },
};

const VALID_SYMBOL = /^[A-Z0-9.^_-]{1,15}$/;

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();

  if (!VALID_SYMBOL.test(normalized)) {
    throw new Error("Invalid market symbol.");
  }

  return normalized;
}

function isDemoMode(): boolean {
  return (
    process.env.FORCE_MOCK_DATA === "true" ||
    !process.env.ALPHA_VANTAGE_API_KEY
  );
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requiredNumber(
  value: unknown,
  field: string
): number {
  const number = finiteNumber(value);

  if (number === null) {
    throw new Error(`Market provider returned invalid ${field}.`);
  }

  return number;
}

async function fetchAlphaVantage(
  url: string
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(
      `Alpha Vantage request failed with status ${response.status}.`
    );
  }

  const payload: unknown = await response.json();

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid Alpha Vantage response.");
  }

  const result = payload as Record<string, unknown>;

  if (result.Note || result.Information || result["Error Message"]) {
    throw new Error(
      String(
        result.Note ||
          result.Information ||
          result["Error Message"]
      )
    );
  }

  return result;
}

function alphaVantageUrl(
  functionName: string,
  symbol: string
): string {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    throw new Error("Alpha Vantage API key is not configured.");
  }

  const params = new URLSearchParams({
    function: functionName,
    symbol,
    apikey: apiKey,
  });

  return `https://www.alphavantage.co/query?${params.toString()}`;
}

/**
 * Retrieves historical daily bars.
 *
 * Demo mode deliberately generates synthetic prices. They must never
 * be represented as actual exchange data.
 */
export async function fetchHistoricalData(
  inputSymbol: string,
  requestedDays = 180
): Promise<Bar[]> {
  const symbol = normalizeSymbol(inputSymbol);

  const days = Math.max(
    1,
    Math.min(365, Math.floor(requestedDays))
  );

  const cacheKey = `history:${symbol}:${days}`;

  const cached = cache.get<Bar[]>(cacheKey);

  if (cached) {
    return cached;
  }

  let bars: Bar[];

  if (isDemoMode()) {
    bars = generateSyntheticHistory(symbol, days);
  } else {
    const payload = await fetchAlphaVantage(
      alphaVantageUrl("TIME_SERIES_DAILY", symbol)
    );

    const series = payload["Time Series (Daily)"];

    if (!series || typeof series !== "object") {
      throw new Error(
        "Historical prices are unavailable for this symbol. " +
          "Check your provider plan, symbol, and API limits."
      );
    }

    const entries = Object.entries(
      series as Record<string, Record<string, string>>
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-days);

    bars = entries.map(([time, row]) => {
      const bar: Bar = {
        time,
        open: requiredNumber(row["1. open"], "open"),
        high: requiredNumber(row["2. high"], "high"),
        low: requiredNumber(row["3. low"], "low"),
        close: requiredNumber(row["4. close"], "close"),
        volume: requiredNumber(row["5. volume"], "volume"),
      };

      if (
        bar.low > bar.high ||
        bar.low > Math.min(bar.open, bar.close) ||
        bar.high < Math.max(bar.open, bar.close) ||
        bar.volume < 0
      ) {
        throw new Error("Market provider returned invalid price bars.");
      }

      return bar;
    });
  }

  if (bars.length === 0) {
    throw new Error("No historical data is available.");
  }

  // Historical prices are cached for five minutes.
  cache.set(cacheKey, bars, 300);

  return bars;
}

/**
 * Retrieves the latest quote and optional company overview.
 */
export async function fetchQuote(
  inputSymbol: string
): Promise<StockQuote> {
  const symbol = normalizeSymbol(inputSymbol);
  const cacheKey = `quote:${symbol}`;

  const cached = cache.get<StockQuote>(cacheKey);

  if (cached) {
    return cached;
  }

  let quote: StockQuote;

  if (isDemoMode()) {
    quote = generateSyntheticQuote(symbol);
  } else {
    const [quotePayload, overviewPayload] = await Promise.all([
      fetchAlphaVantage(
        alphaVantageUrl("GLOBAL_QUOTE", symbol)
      ),
      fetchAlphaVantage(
        alphaVantageUrl("OVERVIEW", symbol)
      ).catch(() => ({} as Record<string, unknown>)),
    ]);

    const raw = quotePayload["Global Quote"];

    if (!raw || typeof raw !== "object") {
      throw new Error(
        "A quote is unavailable. The provider may have reached " +
          "its API limit or may not support this symbol."
      );
    }

    const data = raw as Record<string, string>;
    const overview = overviewPayload;

    const price = requiredNumber(data["05. price"], "price");
    const previousClose = requiredNumber(
      data["08. previous close"],
      "previous close"
    );

    if (price <= 0 || previousClose <= 0) {
      throw new Error("Market provider returned an invalid quote.");
    }

    const change =
      finiteNumber(data["09. change"]) ?? price - previousClose;

    const rawPercent = data["10. change percent"];

    const percentChange =
      rawPercent !== undefined
        ? Number(String(rawPercent).replace("%", ""))
        : (change / previousClose) * 100;

    if (!Number.isFinite(percentChange)) {
      throw new Error("Market provider returned an invalid percentage.");
    }

    const fallbackName =
      SYMBOL_DIRECTORY[symbol]?.name ?? `${symbol}`;

    quote = {
      symbol,
      name:
        typeof overview.Name === "string"
          ? overview.Name
          : fallbackName,
      price,
      change,
      percentChange,
      high: finiteNumber(data["03. high"]) ?? price,
      low: finiteNumber(data["04. low"]) ?? price,
      open: finiteNumber(data["02. open"]) ?? price,
      previousClose,
      volume: finiteNumber(data["06. volume"]) ?? 0,
      peRatio: finiteNumber(overview.PERatio),
      marketCap: finiteNumber(overview.MarketCapitalization)
        ?.toLocaleString("en-US") ?? null,
      week52High: finiteNumber(overview["52WeekHigh"]),
      week52Low: finiteNumber(overview["52WeekLow"]),
      source: "alpha-vantage",
      isDemo: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Quotes have a short cache lifetime to limit provider requests.
  cache.set(cacheKey, quote, 30);

  return quote;
}

/**
 * Creates explicitly labeled synthetic demo data.
 * None of these generated values are real market observations.
 */
function generateSyntheticQuote(symbol: string): StockQuote {
  const meta = SYMBOL_DIRECTORY[symbol];

  // Unknown symbols are rejected in demo mode instead of assigning
  // an invented company name and an arbitrary price.
  if (!meta) {
    throw new Error(
      `Demo data is not configured for ${symbol}. ` +
        "Add the symbol to SYMBOL_DIRECTORY or configure a real provider."
    );
  }

  const price = Number(
    (meta.basePrice * (1 + demoVariation(symbol, 1) * 0.015)).toFixed(2)
  );

  const previousClose = Number(
    (meta.basePrice * (1 + demoVariation(symbol, 2) * 0.01)).toFixed(2)
  );

  const change = Number((price - previousClose).toFixed(2));

  return {
    symbol,
    name: meta.name,
    price,
    change,
    percentChange: Number(
      ((change / previousClose) * 100).toFixed(2)
    ),
    high: Number((price * 1.015).toFixed(2)),
    low: Number((price * 0.985).toFixed(2)),
    open: previousClose,
    previousClose,
    volume: 0,
    peRatio: null,
    marketCap: null,
    week52High: null,
    week52Low: null,
    source: "demo",
    isDemo: true,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Produces deterministic synthetic daily bars so refreshing the page
 * does not randomly rewrite the entire demo chart.
 */
function generateSyntheticHistory(
  symbol: string,
  requestedDays: number
): Bar[] {
  const meta = SYMBOL_DIRECTORY[symbol];

  if (!meta) {
    throw new Error(
      `Demo history is not configured for ${symbol}.`
    );
  }

  const bars: Bar[] = [];
  const today = new Date();
  const totalCalendarDays = Math.ceil(requestedDays * 1.5) + 10;

  let previousClose = meta.basePrice * 0.85;

  for (let offset = totalCalendarDays; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);

    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const dayKey = Number(
      `${symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)}${date.getFullYear()}${date.getMonth()}${date.getDate()}`
    );

    const changeFactor =
      Math.sin(dayKey * 0.17) * 0.012 +
      Math.cos(dayKey * 0.071) * 0.006;

    const open = previousClose;
    const close = Math.max(1, open * (1 + changeFactor));

    const high = Math.max(open, close) * 1.006;
    const low = Math.min(open, close) * 0.994;

    bars.push({
      time: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: 0,
    });

    previousClose = close;
  }

  return bars.slice(-requestedDays);
}

function demoVariation(symbol: string, salt: number): number {
  let hash = salt;

  for (const character of symbol) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100003;
  }

  return Math.sin(hash) * 0.8;
}
