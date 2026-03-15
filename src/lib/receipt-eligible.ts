import type { OcrStatus, ParsedReceipt, ReceiptLineItem, ReceiptReview } from "~/types/receipt-review";

/** Eligible subtotal, prorated tax, and total for one parsed receipt. */
export function calcReceiptEligible(receipt: ParsedReceipt): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const eligibleSubtotal = receipt.items
    .filter((i) => i.eligible)
    .reduce((s, i) => s + i.amount, 0);
  const allSubtotal = receipt.items.reduce((s, i) => s + i.amount, 0);
  const proratedTax =
    receipt.tax != null && allSubtotal > 0
      ? (eligibleSubtotal / allSubtotal) * receipt.tax
      : 0;
  return { subtotal: eligibleSubtotal, tax: proratedTax, total: eligibleSubtotal + proratedTax };
}

/** Sum eligible totals across all ReceiptReview entries (handles old DB format). */
export function calcAllReceiptsEligibleTotal(rawReviews: unknown[]): number {
  return rawReviews
    .map(migrateReview)
    .reduce(
      (sum, review) =>
        sum + (review.receipts ?? []).reduce((s, r) => s + calcReceiptEligible(r).total, 0),
      0,
    );
}

/** Migrate old single-receipt format (items at top level) to the current receipts-array format. */
export function migrateReview(raw: unknown): ReceiptReview {
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.receipts)) return raw as ReceiptReview;
  return {
    url: r.url as string,
    ocrStatus: r.ocrStatus as OcrStatus,
    ocrError: r.ocrError as string | undefined,
    receipts: [
      {
        items: ((r.items as ReceiptLineItem[]) ?? []).map(
          ({ id, description, amount, eligible }) => ({ id, description, amount, eligible }),
        ),
        subtotal: r.detectedSubtotal as number | undefined,
        tax: r.detectedTax as number | undefined,
        total: r.detectedTotal as number | undefined,
      },
    ],
    reviewedAt: r.reviewedAt as string | undefined,
  };
}
