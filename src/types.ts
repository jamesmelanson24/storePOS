export type PaymentType = "cash" | "card";

export type SaleLine = {
  category: string;
  label: string;
  unitAmount: number;
  qty: number;
};

export type Sale = {
  id: number;
  timestamp: Date | string;
  total: number;
  paymentType: PaymentType;
  lines: SaleLine[];
};
