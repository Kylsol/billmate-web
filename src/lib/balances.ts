// src/lib/balances.ts
export function computeBalances(params: {
  memberUids: string[];
  transactions: any[];
}) {
  const { memberUids, transactions } = params;

  const balances: Record<string, number> = {};
  for (const uid of memberUids) balances[uid] = 0;

  for (const t of transactions) {
    if (t?.status !== "active") continue;

    if (t?.type === "bill") {
      const amount = Number(t.amount) || 0;
      const paidBy = t.paidByUid;

      // payer credited full amount
      if (paidBy && balances[paidBy] !== undefined) balances[paidBy] += amount;

      // participants owe their shares
      const shares: Record<string, number> = t.split?.shares ?? {};
      for (const [uid, share] of Object.entries(shares)) {
        if (balances[uid] !== undefined) balances[uid] -= Number(share) || 0;
      }
    }

    if (t?.type === "payment") {
      const amount = Number(t.amount) || 0;
      const fromUid = t.fromUid;
      const toUid = t.toUid;

      if (fromUid && balances[fromUid] !== undefined) balances[fromUid] += amount;
      if (toUid && balances[toUid] !== undefined) balances[toUid] -= amount;
    }
  }

  // round to cents
  for (const uid of Object.keys(balances)) {
    balances[uid] = Math.round(balances[uid] * 100) / 100;
  }

  return balances;
}