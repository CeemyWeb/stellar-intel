import { describe, it, expect, vi } from 'vitest';
import { getPortfolioDashboard, type PortfolioDashboardData } from '@/src/account/portfolioDashboard';

describe('getPortfolioDashboard', () => {
  it('single account - returns dashboard structure', () => {
    const result = getPortfolioDashboard('GA123456789012345678901234567890123456789');

    expect(Object.keys(result.totalBalances).length).toBe(0);
    expect(Object.keys(result.composition).length).toBe(0);
    expect(Object.keys(result.breakdown).length).toBe(1);
    expect(result.breakdown['GA123456789012345678901234567890123456789']!.length).toBe(0);
    expect(result.historical).toBeFalsy();
  });

  it('multiple accounts - returns dashboard with multiple accounts in breakdown', () => {
    const result = getPortfolioDashboard(
      ['GA123456789012345678901234567890123456789', 'GA987654321098765432109876543210987654321']
    );

    expect(Object.keys(result.breakdown)).toHaveLength(2);
    expect('GA123456789012345678901234567890123456789' in result.breakdown).toBe(true);
    expect('GA987654321098765432109876543210987654321' in result.breakdown).toBe(true);
    expect(result.historical).toBeFalsy();
  });

  it('empty accounts - returns empty dashboard', () => {
    const result = getPortfolioDashboard([]);

    expect(result.totalBalances).toEqual({});
    expect(result.composition).toEqual({});
    expect(result.breakdown).toEqual({});
    expect(result.historical).toBeFalsy();
  });

  it('historical data is set when date is provided', () => {
    const result = getPortfolioDashboard('GA123456789012345678901234567890123456789', '2024-01-01');

    expect(result.historical).toBeTruthy();
    expect(Object.keys(result.totalBalances).length).toBe(0);
  });
});