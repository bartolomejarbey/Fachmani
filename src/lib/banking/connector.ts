// Open Banking connector - mock implementation
// Ready for: Fio API, ČSOB API, or other Czech banking APIs

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  counterparty: string;
  variableSymbol?: string;
  description?: string;
}

export interface PaymentMatch {
  transactionId: string;
  paymentId: string;
  confidence: number; // 0-1
}

// TODO: Replace with real Fio API call
// Fio API: https://www.fio.cz/ib2/rest/periods/{token}/{from}/{to}/transactions.json
export async function getTransactions(
  _accountId: string,
  from: string,
  to: string
): Promise<BankTransaction[]> {
  console.log(`[BANKING MOCK] Getting transactions for ${from} to ${to}`);

  // Mock data
  return [
    { id: "tx1", date: from, amount: -15000, currency: "CZK", counterparty: "Česká spořitelna", variableSymbol: "1234567890", description: "Splátka hypotéky" },
    { id: "tx2", date: from, amount: -3500, currency: "CZK", counterparty: "Allianz", variableSymbol: "9876543210", description: "Životní pojištění" },
    { id: "tx3", date: to, amount: 45000, currency: "CZK", counterparty: "Zaměstnavatel", description: "Výplata" },
  ];
}

export function matchPayments(
  transactions: BankTransaction[],
  payments: { id: string; amount: number; variable_symbol?: string }[]
): PaymentMatch[] {
  const matches: PaymentMatch[] = [];

  for (const tx of transactions) {
    if (tx.amount >= 0) continue; // Only outgoing payments
    const absAmount = Math.abs(tx.amount);

    for (const payment of payments) {
      // Match by variable symbol (highest confidence)
      if (tx.variableSymbol && payment.variable_symbol && tx.variableSymbol === payment.variable_symbol) {
        matches.push({ transactionId: tx.id, paymentId: payment.id, confidence: 1.0 });
        continue;
      }
      // Match by amount (lower confidence)
      if (absAmount === payment.amount) {
        matches.push({ transactionId: tx.id, paymentId: payment.id, confidence: 0.7 });
      }
    }
  }

  return matches;
}
