import assert from "node:assert";
import { calculateSMA, calculateRSI, Bar } from "../lib/indicators";

function runTests() {
  console.log("Running Technical Indicators Suite...\n");

  const mockBars: Bar[] = [
    { time: "2024-01-01", open: 10, high: 12, low: 9, close: 10, volume: 1000 },
    { time: "2024-01-02", open: 10, high: 13, low: 10, close: 11, volume: 1000 },
    { time: "2024-01-03", open: 11, high: 14, low: 11, close: 12, volume: 1000 },
    { time: "2024-01-04", open: 12, high: 15, low: 12, close: 13, volume: 1000 },
    { time: "2024-01-05", open: 13, high: 16, low: 13, close: 14, volume: 1000 },
  ];

  // Test SMA Period 3
  // Last 3 closes: 12, 13, 14 -> Average = 39 / 3 = 13.0
  const sma3 = calculateSMA(mockBars, 3);
  assert.strictEqual(sma3.length, 3, "SMA array length should match data.length - period + 1");
  assert.strictEqual(sma3[sma3.length - 1].value, 13.0, "SMA calculation is incorrect");
  console.log("✔ SMA Calculation Test Passed");

  // Test RSI bounded in [0, 100]
  const extendedBars: Bar[] = [];
  let price = 100;
  for (let i = 0; i < 30; i++) {
    price += (i % 2 === 0 ? 1.5 : -1.0);
    extendedBars.push({
      time: `2024-02-${i + 1 < 10 ? "0" + (i + 1) : i + 1}`,
      open: price,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 10000,
    });
  }

  const rsi = calculateRSI(extendedBars, 14);
  assert(rsi.length > 0, "RSI must generate data points for period < data length");
  const latestRsi = rsi[rsi.length - 1].value;
  assert(latestRsi >= 0 && latestRsi <= 100, "RSI must remain constrained between 0 and 100");
  console.log("✔ RSI Range & Smoothing Test Passed (Value:", latestRsi, ")");

  console.log("\nAll core indicator calculations passed successfully.");
}

runTests();