export type TransactionStatus = "active" | "deleted";
export type TransactionType = "bill" | "payment";

export type BillTransaction = {
  type: "bill";
  createdAt?: unknown;
  createdByUid: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  category?: string;

  paidByUid: string; // default to createdByUid if blank in UI
  participants: string[];

  split: {
    method: "equal";
    shares: Record<string, number>;
  };

  status: TransactionStatus;
  deletedAt?: unknown | null;
  deletedByUid?: string | null;
};

export type PaymentTransaction = {
  type: "payment";
  createdAt?: unknown;
  createdByUid: string; // admin who recorded it
  fromUid: string;
  toUid: string;
  amount: number;
  note?: string;
  date: string; // YYYY-MM-DD

  status: TransactionStatus;
  deletedAt?: unknown | null;
  deletedByUid?: string | null;
};

export type Transaction = BillTransaction | PaymentTransaction;