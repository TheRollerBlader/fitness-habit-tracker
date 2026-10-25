import type { RegressionForecastPoint, RegressionMetrics } from '../types';

/**
 * Computes approximation of two-tailed Student's t-value for 95% confidence
 * given degrees of freedom df = n - 2.
 */
export function getTCritical95(df: number): number {
  if (df <= 1) return 12.706;
  if (df === 2) return 4.303;
  if (df === 3) return 3.182;
  if (df === 4) return 2.776;
  if (df === 5) return 2.571;
  if (df <= 10) return 2.228;
  if (df <= 20) return 2.086;
  if (df <= 30) return 2.042;
  if (df <= 60) return 2.000;
  return 1.960; // Asymptotic standard normal distribution Z-score
}

export interface DataPoint {
  date: string;
  value: number;
}

export interface LinearRegressionResult {
  metrics: RegressionMetrics;
  points: RegressionForecastPoint[];
}

/**
 * Fits an Ordinary Least Squares (OLS) regression line with 95% prediction intervals
 * and projects into the future for `forecastDays` ahead.
 */
export function calculateLinearRegressionForecast(
  data: DataPoint[],
  forecastDays: number = 14,
  clampMinZero: boolean = true
): LinearRegressionResult {
  const n = data.length;

  if (n < 2) {
    const singleVal = n === 1 ? data[0].value : 0;
    return {
      metrics: {
        slope: 0,
        intercept: singleVal,
        rSquared: 0,
        standardError: 0,
        sampleSize: n,
        trendDirection: 'flat',
        formulaString: `y = ${singleVal.toFixed(2)}`
      },
      points: data.map((d, i) => ({
        date: d.date,
        dayIndex: i,
        actual: d.value,
        predicted: d.value,
        ciLower: d.value,
        ciUpper: d.value,
        isForecast: false
      }))
    };
  }

  // 1. Calculate Means
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  // 2. Calculate Slope and Intercept
  let sumNumerator = 0;
  let sumDenominator = 0;
  for (let i = 0; i < n; i++) {
    const diffX = i - meanX;
    const diffY = data[i].value - meanY;
    sumNumerator += diffX * diffY;
    sumDenominator += diffX * diffX;
  }

  const slope = sumDenominator !== 0 ? sumNumerator / sumDenominator : 0;
  const intercept = meanY - slope * meanX;

  // 3. Compute Residuals, SS_res, SS_tot
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * i;
    const res = data[i].value - yHat;
    ssRes += res * res;
    const diffMean = data[i].value - meanY;
    ssTot += diffMean * diffMean;
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;
  const df = Math.max(1, n - 2);
  const standardError = Math.sqrt(ssRes / df);
  const tCrit = getTCritical95(df);

  const trendDirection: 'improving' | 'declining' | 'flat' =
    Math.abs(slope) < 0.001 ? 'flat' : slope > 0 ? 'improving' : 'declining';

  const sign = intercept >= 0 ? '+' : '-';
  const formulaString = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(2)}`;

  // 4. Generate points for historical data
  const points: RegressionForecastPoint[] = [];

  for (let i = 0; i < n; i++) {
    const yHat = intercept + slope * i;
    const diffX = i - meanX;
    const sePred = standardError * Math.sqrt(1 + 1 / n + (diffX * diffX) / (sumDenominator || 1));
    const margin = tCrit * sePred;

    let ciLower = yHat - margin;
    let ciUpper = yHat + margin;

    if (clampMinZero) {
      ciLower = Math.max(0, ciLower);
      ciUpper = Math.max(0, ciUpper);
    }

    points.push({
      date: data[i].date,
      dayIndex: i,
      actual: Math.round(data[i].value * 10) / 10,
      predicted: Math.round(yHat * 10) / 10,
      ciLower: Math.round(ciLower * 10) / 10,
      ciUpper: Math.round(ciUpper * 10) / 10,
      isForecast: false
    });
  }

  // 5. Generate future forecast points
  if (n > 0 && forecastDays > 0) {
    const lastDate = new Date(data[n - 1].date);
    for (let f = 1; f <= forecastDays; f++) {
      const idx = n - 1 + f;
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + f);
      const dateStr = forecastDate.toISOString().split('T')[0];

      const yHat = intercept + slope * idx;
      const diffX = idx - meanX;
      const sePred = standardError * Math.sqrt(1 + 1 / n + (diffX * diffX) / (sumDenominator || 1));
      const margin = tCrit * sePred;

      let ciLower = yHat - margin;
      let ciUpper = yHat + margin;

      if (clampMinZero) {
        ciLower = Math.max(0, ciLower);
        ciUpper = Math.max(0, ciUpper);
      }

      points.push({
        date: dateStr,
        dayIndex: idx,
        predicted: Math.round(yHat * 10) / 10,
        ciLower: Math.round(ciLower * 10) / 10,
        ciUpper: Math.round(ciUpper * 10) / 10,
        isForecast: true
      });
    }
  }

  return {
    metrics: {
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
      standardError: Math.round(standardError * 100) / 100,
      sampleSize: n,
      trendDirection,
      formulaString
    },
    points
  };
}
