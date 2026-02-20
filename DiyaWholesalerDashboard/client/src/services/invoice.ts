import api from "@/lib/axios";

export interface InvoicePreviewItem {
  productName: string;
  hsnCode: string;
  quantitySellingUnit: number;
  sellingUnit: string;
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  lineTotal: number;
}

export interface InvoicePreview {
  invoiceNumber: string;
  invoiceDate: string;
  retailerName: string;
  items: InvoicePreviewItem[];
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  grandTotal: number;
  tallyExported?: boolean;
}

/**
 * Get read-only invoice preview for verification.
 * Backend: GET /api/invoices/{invoiceId}
 */
export async function getInvoicePreview(invoiceId: string): Promise<InvoicePreview> {
  const res = await api.get<InvoicePreview>(`/invoices/${invoiceId}`);
  return res.data;
}

export interface InvoiceFinalizeResponse {
  invoiceId: string;
  invoiceNumber?: string;
  grandTotal?: number;
}

/**
 * Finalize invoice for a delivered order.
 * Backend: POST /api/invoices/{orderId}/finalize
 */
export async function finalizeInvoice(orderId: string): Promise<InvoiceFinalizeResponse> {
  const res = await api.post<InvoiceFinalizeResponse>(`/invoices/${orderId}/finalize`);
  return res.data;
}

/**
 * Export invoice to Tally as sales voucher.
 * Backend: POST /api/invoices/{invoiceId}/export-tally
 */
export async function exportToTally(invoiceId: string): Promise<void> {
  await api.post(`/invoices/${invoiceId}/export-tally`);
}
