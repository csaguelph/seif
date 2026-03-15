export type OcrStatus = "pending" | "processing" | "complete" | "error";

export interface ReceiptLineItem {
  id: string;
  description: string;
  /** Total cost for this line item, including any tax */
  amount: number;
  /** Tax component broken out by OCR (if available) */
  tax?: number;
  eligible: boolean;
}

export interface ReceiptReview {
  url: string;
  ocrStatus: OcrStatus;
  ocrError?: string;
  items: ReceiptLineItem[];
  /** Subtotal as detected by OCR (before tax) */
  detectedSubtotal?: number;
  /** Total tax as detected by OCR */
  detectedTax?: number;
  /** Grand total as detected by OCR */
  detectedTotal?: number;
  /** ISO timestamp of last admin save */
  reviewedAt?: string;
}
