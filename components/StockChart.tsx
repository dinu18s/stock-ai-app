"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, ColorType } from "lightweight-charts";
import { Bar } from "@/lib/indicators";
import { Layers } from "lucide-react";

interface StockChartProps {
  symbol: string;
  history: Bar[];
  overlays: {
    sma20: { time: string; value: number }[];
    sma50: { time: string; value: number }[];
    rsi: { time: string; value: number }[];
  };
}

export function StockChart({ history, overlays }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [showSMA, setShowSMA] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#151922" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#232936" },
        horzLines: { color: "#232936" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
      timeScale: {
        borderColor: "#232936",
        timeVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00c076",
      downColor: "#ff4d4d",
      borderVisible: false,
      wickUpColor: "#00c076",
      wickDownColor: "#ff4d4d",
    });

    const sma20Series = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 2,
      title: "SMA 20",
    });

    const sma50Series = chart.addLineSeries({
      color: "#fbbf24",
      lineWidth: 2,
      title: "SMA 50",
    });

    candleSeriesRef.current = candleSeries;
    sma20SeriesRef.current = sma20Series;
    sma50SeriesRef.current = sma50Series;
    chartInstance.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Update chart dataset
  useEffect(() => {
    if (!chartInstance.current || !candleSeriesRef.current || history.length === 0) return;

    // Format bars for Lightweight Charts
    const formattedCandles = history.map((b) => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    candleSeriesRef.current.setData(formattedCandles as any);

    if (sma20SeriesRef.current && overlays.sma20) {
      sma20SeriesRef.current.setData(overlays.sma20 as any);
      sma20SeriesRef.current.applyOptions({ visible: showSMA });
    }

    if (sma50SeriesRef.current && overlays.sma50) {
      sma50SeriesRef.current.setData(overlays.sma50 as any);
      sma50SeriesRef.current.applyOptions({ visible: showSMA });
    }

    chartInstance.current.timeScale().fitContent();
  }, [history, overlays, showSMA]);

  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Technical Price Chart</span>
          <span className="text-xs text-zinc-500 font-mono">Candlestick (Daily)</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              showSMA
                ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                : "bg-surfaceHover border-border text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overlays (SMA 20/50)</span>
          </button>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-border/50" />
      
      <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-bullish inline-block"></span> Bullish Candle
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-bearish inline-block"></span> Bearish Candle
        </div>
        {showSMA && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-sky-400 inline-block"></span> SMA 20
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-amber-400 inline-block"></span> SMA 50
            </div>
          </>
        )}
      </div>
    </div>
  );
}