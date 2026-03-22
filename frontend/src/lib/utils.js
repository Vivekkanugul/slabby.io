import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value, compact = false) {
  if (value === undefined || value === null) return '$0';
  
  if (compact && Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}

export function formatPercent(value) {
  if (value === undefined || value === null) return '0%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value) {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

export function getSignalColor(signal) {
  const upperSignal = signal?.toUpperCase() || '';
  if (upperSignal.includes('BUY')) return 'text-emerald-400';
  if (upperSignal.includes('SELL')) return 'text-red-400';
  return 'text-amber-400';
}

export function getSignalBgColor(signal) {
  const upperSignal = signal?.toUpperCase() || '';
  if (upperSignal.includes('BUY')) return 'bg-emerald-500/10 border-emerald-500/20';
  if (upperSignal.includes('SELL')) return 'bg-red-500/10 border-red-500/20';
  return 'bg-amber-500/10 border-amber-500/20';
}

export function getPriceChangeColor(value) {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-zinc-400';
}

export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
