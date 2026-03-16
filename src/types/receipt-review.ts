export type OcrStatus = "pending" | "processing" | "complete" | "error";

export interface ReceiptLineItem {
  id: string;
  description: string;
  /** Line item price as shown on the receipt, before any receipt-level tax */
  amount: number;
  eligible: boolean;
}

export interface ParsedReceipt {
  storeName?: string;
  items: ReceiptLineItem[];
  /** Pre-tax subtotal as shown on the receipt */
  subtotal?: number;
  /** Total tax charged on this receipt */
  tax?: number;
  /** Grand total as shown on the receipt */
  total?: number;
}

export interface ReceiptReview {
  url: string;
  ocrStatus: OcrStatus;
  ocrError?: string;
  /** One entry per distinct receipt detected in the image */
  receipts: ParsedReceipt[];
  /** ISO timestamp of last admin save */
  reviewedAt?: string;
}
