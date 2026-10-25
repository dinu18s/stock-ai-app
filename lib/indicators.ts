export interface Bar {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calculateSMA(data: Bar[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i + 1 < period) continue;
    const slice = data.slice(i + 1 - period, i + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
    result.push({
      time: data[i].time,
      value: parseFloat((sum / period).toFixed(2)),
    });
  }
  return result;
}

export function calculateRSI(data: Bar[], period = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  if (data.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + firstRs));
  result.push({ time: data[period].time, value: parseFloat(firstRsi.toFixed(2)) });

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    result.push({ time: data[i].time, value: parseFloat(rsi.toFixed(2)) });
  }

  return result;
}

export function calculateMACD(
  data: Bar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { time: string; macd: number; signal: number; histogram: number }[] {
  const calculateEMA = (period: number): number[] => {
    const k = 2 / (period + 1);
    const emaArray: number[] = [];
    let initialSum = 0;
    for (let i = 0; i < period; i++) {
      initialSum += data[i].close;
    }
    emaArray[period - 1] = initialSum / period;

    for (let i = period; i < data.length; i++) {
      emaArray[i] = data[i].close * k + emaArray[i - 1] * (1 - k);
    }
    return emaArray;
  };

  const fastEMA = calculateEMA(fastPeriod);
  const slowEMA = calculateEMA(slowPeriod);
  const macdLine: { index: number; value: number }[] = [];

  for (let i = slowPeriod - 1; i < data.length; i++) {
    macdLine.push({
      index: i,
      value: fastEMA[i] - slowEMA[i],
    });
  }

  // Signal line (EMA of MACD line)
  const kSignal = 2 / (signalPeriod + 1);
  const signalArray: number[] = [];
  let sigSum = 0;

  for (let i = 0; i < signalPeriod; i++) {
    sigSum += macdLine[i].value;
  }
  signalArray[signalPeriod - 1] = sigSum / signalPeriod;

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signalArray[i] = macdLine[i].value * kSignal + signalArray[i - 1] * (1 - kSignal);
  }

  const results = [];
  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    const originalIndex = macdLine[i].index;
    const macdVal = macdLine[i].value;
    const sigVal = signalArray[i];
    results.push({
      time: data[originalIndex].time,
      macd: parseFloat(macdVal.toFixed(2)),
      signal: parseFloat(sigVal.toFixed(2)),
      histogram: parseFloat((macdVal - sigVal).toFixed(2)),
    });
  }

  return results;
}