import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantPulse AI | Real-time Stock Analysis & Copilot",
  description: "Live interactive stock charts with AI-driven quantitative and fundamental analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background min-h-screen text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}