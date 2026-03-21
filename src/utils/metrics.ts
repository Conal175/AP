/**
 * utils/metrics.ts — Các hàm tính chỉ số quảng cáo dùng chung
 * Trước đây bị duplicate trong Dashboard.tsx và DailyReport.tsx
 */

export const calculateCTR = (clicks: number, impressions: number): number =>
  impressions > 0 ? (clicks / impressions) * 100 : 0;

export const calculateCPA = (spend: number, messages: number): number =>
  messages > 0 ? spend / messages : 0;

export const calculateCPO = (spend: number, orders: number): number =>
  orders > 0 ? spend / orders : 0;

export const calculateCR = (orders: number, messages: number): number =>
  messages > 0 ? (orders / messages) * 100 : 0;

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN').format(value);

export const formatPercent = (value: number): string =>
  value.toFixed(2) + '%';
