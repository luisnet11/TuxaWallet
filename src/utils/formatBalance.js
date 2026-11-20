export function formatTokenAmount(value, decimals) {
  if (value === null || value === undefined) return '--';
  if (value === 0n) return '0.0000';
  
  const divisor = 10n ** BigInt(decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  let fractionStr = fractionalPart.toString().padStart(decimals, '0');
  fractionStr = fractionStr.slice(0, 6).replace(/0+$/, '');
  
  if (fractionStr.length === 0) fractionStr = '0000';
  else if (fractionStr.length < 4) fractionStr = fractionStr.padEnd(4, '0');
  
  return `${integerPart}.${fractionStr}`;
}

export function toUsdNumber(value, decimals, price) {
  if (value === null || value === undefined || price === null || price === undefined) return null;
  const num = Number(value) / Math.pow(10, decimals);
  return num * price;
}

export function formatUsd(amount) {
  if (amount === null || amount === undefined) return '--';
  return `$${amount.toFixed(2)}`;
    }
