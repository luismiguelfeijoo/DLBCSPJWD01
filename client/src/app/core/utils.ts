/**
 * Combines a Date object/string and a Time object/string into an ISO-8601 string.
 */
export function combineDateAndTime(date: Date | string, time: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const timeObj = time instanceof Date ? time : new Date(time);

  const combined = new Date(dateObj);
  if (!isNaN(timeObj.getTime())) {
    combined.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds(), 0);
  }

  return combined.toISOString();
}

/**
 * Rounds a numeric value to a specified number of decimal places (defaults to 2).
 */
export function roundToDecimals(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Calculates the target currency amount based on base amount and exchange rate.
 */
export function calculateAmount(baseAmount: number, rate: number, decimals = 2): number {
  return roundToDecimals(baseAmount * rate, decimals);
}

/**
 * Calculates effective exchange rate for custom manual conversions (amount / baseAmount).
 */
export function calculateEffectiveRate(
  amount: number,
  baseAmount: number,
  decimals = 2,
): number {
  return baseAmount > 0 ? roundToDecimals(amount / baseAmount, decimals) : 0;
}
