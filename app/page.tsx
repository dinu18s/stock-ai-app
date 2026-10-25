"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Disclaimer } from "@/components/Disclaimer";
import { StockChart } from "@/components/StockChart";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { AIAssistant } from "@/components/AIAssistant";
import { StockQuote } from "@/lib/market-data";
import { AIAnalysisResult } from "@/lib/ai-service";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from "lucide-react";

export default function Dashboard() {
  const [symbol, setSymbol] = useState("AAPL");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [overlays, setOverlays] = useState<any>({ sma20: [], sma50: [], rsi: [] });
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const loadData = useCallback(async (sym: string) => {
    try {
      // 1. Fetch Quote
      const qRes = await fetch(`/api/quote?symbol=${sym}`);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuote(qData);
      }

      // 2. Fetch Chart & Indicators
      const hRes = await fetch(`/api/history?symbol=${sym}&days=180`);
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistory(hData.candles);
        setOverlays(hData.overlays);
      }

      // 3. Fetch AI Analysis
      setAnalysisLoading(true);
      const aRes = await fetch(`/api/analyze?symbol=${sym}`);
      if (aRes.ok) {
        const aData = await aRes.json();
        setAnalysis(aData);
      }
    } catch (err) {
      console.error("Failed to load ticker data", err);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(symbol);
  }, [symbol, loadData]);

  // Live SSE connection with polling fallback
  useEffect(() => {
    let sse: EventSource | null = null;
    let fallbackPoll: NodeJS.Timeout | null = null;

    try {
      sse = new EventSource(`/api/realtime?symbol=${symbol}`);
      sse.onopen = () => setIsLiveActive(true);

      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setQuote((prev) => {
            if (!prev) return null;
            const updatedPrice = parseFloat((prev.price + payload.delta).toFixed(2));
            const diff = parseFloat((updatedPrice - prev.previousClose).toFixed(2));
            const pct = parseFloat(((diff / prev.previousClose) * 100).toFixed(2));
            return {
              ...prev,
              price: updatedPrice,
              change: diff,
              percentChange: pct,
            };
          });
        } catch {}
      };

      sse.onerror = () => {
        setIsLiveActive(false);
        sse?.close();
        // Graceful fallback to 5s polling
        fallbackPoll = setInterval(async () => {
          const qRes = await fetch(`/api/quote?symbol=${symbol}`);
          if (qRes.ok) {
            const data = await qRes.json();
            setQuote(data);
          }
        }, 5000);
      };
    } catch {
      setIsLiveActive(false);
    }

    return () => {
      if (sse) sse.close();
      if (fallbackPoll) clearInterval(fallbackPoll);
    };
  }, [symbol]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-12">
      <Header selectedSymbol={symbol} onSelectSymbol={(s) => setSymbol(s)} />
      <Disclaimer />

      <main className="max-w-7xl mx-auto px-4 mt-6 w-full flex flex-col gap-6">
        {/* Quote & Live Status Ribbon */}
        {quote && (
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-wide">{quote.symbol}</h2>
                  <span className="text-xs text-zinc-400 font-normal">{quote.name}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-mono font-bold text-white">${quote.price.toFixed(2)}</span>
                  <span
                    className={`flex items-center text-xs font-semibold font-mono ${
                      quote.change >= 0 ? "text-bullish" : "text-bearish"
                    }`}
                  >
                    {quote.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {quote.change > 0 ? "+" : ""}
                    {quote.change} ({quote.percentChange}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-background border border-border px-3 py-1.5 rounded-lg">
                <span className="text-zinc-500 block">P/E RATIO</span>
                <span className="text-white font-semibold">{quote.peRatio}</span>
              </div>
              <div className="bg-background border border-border px-3 py-1.5 rounded-lg">
                <span className="text-zinc-500 block">MARKET CAP</span>
                <span className="text-white font-semibold">{quote.marketCap}</span>
              </div>
              <div className="bg-background border border-border px-3 py-1.5 rounded-lg">
                <span className="text-zinc-500 block">52W RANGE</span>
                <span className="text-white font-semibold">
                  ${quote.week52Low} - ${quote.week52High}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 pl-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveActive ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                  }`}
                />
                <span className="text-[11px] text-zinc-400 font-sans flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  {isLiveActive ? "SSE Live Feed" : "Polling (5s)"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chart View */}
        <StockChart symbol={symbol} history={history} overlays={overlays} />

        {/* AI Quantitative Analysis Panel */}
        <AnalysisPanel analysis={analysis} loading={analysisLoading} />
      </main>

      {/* Floating Embedded AI Copilot */}
      <AIAssistant symbol={symbol} />
    </div>
  );
}