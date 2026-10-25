import React from "react";
import { Activity, ShieldCheck } from "lucide-react";

interface HeaderProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

const ASSETS = [
  { symbol: "AAPL", label: "Apple" },
  { symbol: "TSLA", label: "Tesla" },
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "SPY", label: "S&P 500 ETF" },
  { symbol: "VOO", label: "Vanguard S&P" },
];

export function Header({ selectedSymbol, onSelectSymbol }: HeaderProps) {
  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-bullish" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
              QuantPulse <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">AI PRO</span>
            </h1>
            <p className="text-xs text-zinc-400 hidden sm:block">Automated Quantitative & Fundamental Intelligence</p>
          </div>
        </div>

        {/* Ticker Selector */}
        <div className="flex items-center gap-1.5 bg-background p-1 rounded-lg border border-border">
          {ASSETS.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => onSelectSymbol(asset.symbol)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedSymbol === asset.symbol
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-surfaceHover"
              }`}
            >
              {asset.symbol}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Proxy API</span>
        </div>
      </div>
    </header>
  );
}