import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "AAPL").toUpperCase();

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let active = true;

  const intervalId = setInterval(async () => {
    if (!active) {
      clearInterval(intervalId);
      return;
    }

    try {
      const delta = (Math.random() - 0.495) * 0.4;
      const data = {
        symbol,
        delta: parseFloat(delta.toFixed(2)),
        timestamp: new Date().toISOString(),
      };

      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      active = false;
      clearInterval(intervalId);
      try {
        await writer.close();
      } catch {}
    }
  }, 2500);

  request.signal.addEventListener("abort", () => {
    active = false;
    clearInterval(intervalId);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}