"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, MessageSquare, Loader2, RefreshCw } from "lucide-react";

interface AIAssistantProps {
  symbol: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant({ symbol }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm your dedicated market analysis assistant for ${symbol}. Ask me anything about ${symbol}'s technical indicators, valuation multiples, support/resistance, or risks.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset dialogue if user switches ticker
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `I am now tracking ${symbol}. Feel free to ask about its moving averages, RSI status, or market thesis.`,
      },
    ]);
  }, [symbol]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    const newHistory: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages([...newHistory, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([
          ...newHistory,
          { role: "assistant", content: data.error || "System encountered an error answering this query." },
        ]);
      }
    } catch {
      setMessages([
        ...newHistory,
        { role: "assistant", content: "Network connection lost. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm">Ask AI about {symbol}</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[520px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Assistant Header */}
          <div className="p-3.5 bg-background border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Financial Analyst Bot
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">Scoped strictly to {symbol}</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-surfaceHover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Stream */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-xl leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-surfaceHover text-zinc-200 border border-border/80 rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs pl-8">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Scanning technical data...</span>
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div className="px-3 py-1.5 bg-background/50 border-t border-border flex items-center gap-1.5 overflow-x-auto text-[11px] text-zinc-400">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Ask:</span>
            <button
              onClick={() => setInput("What are the key support and resistance levels?")}
              className="whitespace-nowrap px-2 py-0.5 rounded bg-surfaceHover hover:text-white border border-border/60"
            >
              Support/Resistance?
            </button>
            <button
              onClick={() => setInput("What does the RSI suggest right now?")}
              className="whitespace-nowrap px-2 py-0.5 rounded bg-surfaceHover hover:text-white border border-border/60"
            >
              RSI Status?
            </button>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 bg-background border-t border-border flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${symbol} fundamentals, indicators...`}
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}