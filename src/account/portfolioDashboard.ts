export interface PortfolioBalance {
  asset: string;
  amount: string;
}

export interface PortfolioAccountData {
  account: string;
  balances: PortfolioBalance[];
}

export interface PortfolioTotals {
  [asset: string]: string;
}

export interface PortfolioComposition {
  [asset: string]: number;
}

export interface PortfolioDashboardData {
  totalBalances: PortfolioTotals;
  composition: PortfolioComposition;
  breakdown: Record<string, PortfolioBalance[]>;
  historical?: PortfolioDashboardData | null | undefined;
}

function computeTotals(
  allBalances: PortfolioBalance[]
): PortfolioTotals {
  const totals: PortfolioTotals = {};
  for (const bal of allBalances) {
    totals[bal.asset] = (totals[bal.asset] ?? '0') + bal.amount;
  }
  return totals;
}

function computeComposition(
  totals: PortfolioTotals
): PortfolioComposition {
  const totalAmount = Object.values(totals)
    .reduce((sum, amt) => BigInt(sum) + BigInt(amt), BigInt(0));

  const composition: PortfolioComposition = {};
  for (const [asset, amount] of Object.entries(totals)) {
    if (totalAmount > 0n) {
      composition[asset] = Number(BigInt(amount) * 100n / totalAmount);
    } else {
      composition[asset] = 0;
    }
  }
  return composition;
}

function computeBreakdown(
  accounts: PortfolioAccountData[]
): Record<string, PortfolioBalance[]> {
  const breakdown: Record<string, PortfolioBalance[]> = {};
  for (const acc of accounts) {
    breakdown[acc.account] = acc.balances;
  }
  return breakdown;
}

export function getPortfolioDashboard(
  accounts: string | string[],
  date?: string
): PortfolioDashboardData {
  const accountList = Array.isArray(accounts) ? accounts : [accounts];

  if (accountList.length === 0) {
    return {
      totalBalances: {},
      composition: {},
      breakdown: {},
    };
  }

  const accountData: PortfolioAccountData[] = accountList.map((account) => ({
    account,
    balances: [],
  }));

  const allBalances: PortfolioBalance[] = [];
  for (const acc of accountData) {
    for (const bal of acc.balances) {
      allBalances.push(bal);
    }
  }

  const totals = computeTotals(allBalances);
  const composition = computeComposition(totals);
  const breakdown = computeBreakdown(accountData);

  let historical: PortfolioDashboardData | undefined;
  if (date) {
    historical = {
      totalBalances: {},
      composition: {},
      breakdown: {},
    };
  }

  return {
    totalBalances: totals,
    composition,
    breakdown,
    historical,
  };
}