import React from "react";
import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="bg-amber-950/30 border-y border-amber-800/40 px-4 py-2 text-xs text-amber-300/90 flex items-center justify-center gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        <strong>Informational & Educational Use Only:</strong> AI models can hallucinate. This portal does NOT provide certified investment, tax, or legal advice.
      </span>
    </div>
  );
}