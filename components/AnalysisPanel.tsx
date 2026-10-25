import React from "react";
import { AIAnalysisResult } from "@/lib/ai-service";
import { TrendingUp, TrendingDown, Minus, ShieldAlert, Sparkles, Target, BarChart2 } from "lucide-react";

interface AnalysisPanelProps {
  analysis: AIAnalysisResult | null;
  loading: boolean;
}

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 animate-pulse flex flex-col gap-4">
        <div className="h-6 bg-surfaceHover rounded w-1/3"></div>
        <div className="h-16 bg-surfaceHover rounded w-full"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-surfaceHover rounded"></div>
          <div className="h-24 bg-surfaceHover rounded"></div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const sentimentIcon =
    analysis.sentiment === "Bullish" ? (
      <TrendingUp className="w-5 h-5 text-bullish" />
    ) : analysis.sentiment === "Bearish" ? (
      <TrendingDown className="w-5 h-5 text-bearish" />
    ) : (
      <Minus className="w-5 h-5 text-amber-400" />
    );

  return (
    <div className="bg-surface rounded-xl border border-border p-6 flex flex-col gap-6">
      {/* Top Banner / Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>AI Synthesized Market Thesis</span>
          </div>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed max-w-2xl">{analysis.summary}</p>
        </div>

        <div className="bg-background border border-border rounded-xl p-3 flex items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-lg bg-surfaceHover">{sentimentIcon}</div>
          <div>
            <div className="text-xs text-zinc-400 uppercase font-mono">Posture</div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              {analysis.sentiment}
              <span className="text-xs font-normal text-zinc-400 font-mono">({analysis.sentimentScore}/100)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Technical Diagnostics */}
        <div className="bg-background/60 border border-border rounded-lg p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <BarChart2 className="w-4 h-4 text-sky-400" />
            <span>Technicals & Momentum</span>
          </div>
          <p className="text-xs text-zinc-400">{analysis.technicals.rsiStatus}</p>
          <p className="text-xs text-zinc-400">{analysis.technicals.trendAnalysis}</p>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50 text-xs">
            <div>
              <span className="text-zinc-500 block">Estimated Support</span>
              <span className="text-white font-mono font-medium">${analysis.technicals.supportLevel}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Estimated Resistance</span>
              <span className="text-white font-mono font-medium">${analysis.technicals.resistanceLevel}</span>
            </div>
          </div>
        </div>

        {/* Fundamentals */}
        <div className="bg-background/60 border border-border rounded-lg p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Valuation & Scale</span>
          </div>
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-500">Valuation Context: </span>
            {analysis.fundamentals.peRating}
          </div>
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-500">Capitalization: </span>
            {analysis.fundamentals.marketCapContext}
          </div>
          <ul className="mt-1 list-disc list-inside text-xs text-zinc-300 space-y-1">
            {analysis.fundamentals.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Catalysts & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3.5">
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Key Tailwinds & Catalysts
          </span>
          <ul className="space-y-1 text-xs text-zinc-300">
            {analysis.catalysts.map((c, i) => (
              <li key={i}>• {c}</li>
            ))}
          </ul>
        </div>

        <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3.5">
          <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Risk Factors
          </span>
          <ul className="space-y-1 text-xs text-zinc-300">
            {analysis.risks.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}