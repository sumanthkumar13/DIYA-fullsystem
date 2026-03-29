package com.diya.backend.service;

import com.diya.backend.entity.Invoice;
import com.diya.backend.entity.Retailer;
import com.diya.backend.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Exports finalized invoices to Tally as Sales Vouchers.
 * Before sending voucher XML, ensures required ledgers exist in Tally.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TallyVoucherExportService {

    private static final DateTimeFormatter TALLY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String CREATED_MARKER = "<CREATED>1</CREATED>";
    private static final String SALES_LEDGER = "Sales";
    private static final String OUTPUT_CGST_LEDGER = "Output CGST";
    private static final String OUTPUT_SGST_LEDGER = "Output SGST";
    private static final String PARTY_PARENT_GROUP = "Sundry Debtors";
    private static final String SALES_PARENT_GROUP = "Sales Accounts";
    private static final String TAX_PARENT_GROUP = "Duties & Taxes";

    private final InvoiceRepository invoiceRepository;
    private final TallyLedgerService tallyLedgerService;
    private final TallyGatewayService tallyGatewayService;

    /**
     * Export invoice to Tally. Ensures party, sales, and tax ledgers exist, then
     * sends voucher XML.
     * Idempotent: skips if already exported (tallyExported = true).
     */
    @Transactional
    public void exportSalesVoucher(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (Boolean.TRUE.equals(invoice.getTallyExported())) {
            throw new RuntimeException("Invoice already exported to Tally");
        }

        String retailerName = getRetailerDisplayName(invoice.getRetailer());

        tallyLedgerService.ensurePartyLedger(retailerName);
        tallyLedgerService.ensureSalesLedger();
        tallyLedgerService.ensureTaxLedgers();

        sendVoucherXml(invoice);

        invoice.setTallyExported(true);
        invoiceRepository.save(invoice);
    }

    private String getRetailerDisplayName(Retailer retailer) {
        if (retailer == null)
            return "Retailer";
        if (retailer.getUser() != null && retailer.getUser().getName() != null
                && !retailer.getUser().getName().isBlank()) {
            return retailer.getUser().getName();
        }
        if (retailer.getShopName() != null && !retailer.getShopName().isBlank()) {
            return retailer.getShopName();
        }
        return "Retailer";
    }

    /**
     * Build and post Sales Voucher XML to Tally. Uses stored invoice values only.
     */
    private void sendVoucherXml(Invoice invoice) {
        String invoiceNumber = invoice.getInvoiceNumber();
        String date = invoice.getInvoiceDate().toLocalDate().format(TALLY_DATE);
        String retailerName = getRetailerDisplayName(invoice.getRetailer());
        String retailerNameEscaped = escapeXml(retailerName);
        String orderNumber = invoice.getOrder() != null ? invoice.getOrder().getOrderNumber() : null;
        UUID retailerId = invoice.getRetailer() != null ? invoice.getRetailer().getId() : null;

        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal totalTaxable = invoice.getTotalTaxable() != null ? invoice.getTotalTaxable() : BigDecimal.ZERO;
        BigDecimal totalCgst = invoice.getTotalCgst() != null ? invoice.getTotalCgst() : BigDecimal.ZERO;
        BigDecimal totalSgst = invoice.getTotalSgst() != null ? invoice.getTotalSgst() : BigDecimal.ZERO;
        BigDecimal debitTotal = grandTotal;
        BigDecimal creditTotal = totalTaxable.add(totalCgst).add(totalSgst);

        String grandTotalStr = grandTotal.toPlainString();
        String totalTaxableStr = totalTaxable.toPlainString();
        String totalCgstStr = totalCgst.toPlainString();
        String totalSgstStr = totalSgst.toPlainString();

        String xml = """
                <ENVELOPE>
                 <HEADER>
                  <TALLYREQUEST>IMPORT</TALLYREQUEST>
                 </HEADER>
                 <BODY>
                  <IMPORTDATA>
                   <REQUESTDESC>
                    <REPORTNAME>Vouchers</REPORTNAME>
                   </REQUESTDESC>
                   <REQUESTDATA>
                    <TALLYMESSAGE xmlns:UDF="TallyUDF">
                     <VOUCHER VCHTYPE="Sales" ACTION="Create">
                      <DATE>%s</DATE>
                      <VOUCHERNUMBER>%s</VOUCHERNUMBER>
                      <NARRATION>Sales via Diya</NARRATION>
                      <PARTYLEDGERNAME>%s</PARTYLEDGERNAME>
                      <ALLLEDGERENTRIES.LIST>
                       <LEDGERNAME>%s</LEDGERNAME>
                       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                       <AMOUNT>-%s</AMOUNT>
                      </ALLLEDGERENTRIES.LIST>
                      <ALLLEDGERENTRIES.LIST>
                       <LEDGERNAME>%s</LEDGERNAME>
                       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                       <AMOUNT>%s</AMOUNT>
                      </ALLLEDGERENTRIES.LIST>
                      <ALLLEDGERENTRIES.LIST>
                       <LEDGERNAME>%s</LEDGERNAME>
                       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                       <AMOUNT>%s</AMOUNT>
                      </ALLLEDGERENTRIES.LIST>
                      <ALLLEDGERENTRIES.LIST>
                       <LEDGERNAME>%s</LEDGERNAME>
                       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                       <AMOUNT>%s</AMOUNT>
                      </ALLLEDGERENTRIES.LIST>
                     </VOUCHER>
                    </TALLYMESSAGE>
                   </REQUESTDATA>
                  </IMPORTDATA>
                 </BODY>
                </ENVELOPE>
                """.formatted(
                date,
                escapeXml(invoiceNumber),
                retailerNameEscaped,
                retailerNameEscaped,
                grandTotalStr,
                SALES_LEDGER,
                totalTaxableStr,
                OUTPUT_CGST_LEDGER,
                totalCgstStr,
                OUTPUT_SGST_LEDGER,
                totalSgstStr);

        log.info("""
                ===== TALLY EXPORT DEBUG START =====
                Call chain:
                InvoiceController.exportToTally()
                -> InvoiceService.ensureInvoiceAccess()
                -> TallyVoucherExportService.exportSalesVoucher()
                -> TallyLedgerService.ensurePartyLedger()
                -> TallyLedgerService.ensureSalesLedger()
                -> TallyLedgerService.ensureTaxLedgers()
                -> TallyVoucherExportService.sendVoucherXml()
                -> TallyGatewayService.postXmlAndGetResponse()

                Invoice data used for voucher:
                invoiceId = {}
                invoiceNumber = {}
                invoiceDate = {}
                grandTotal = {}
                totalTaxable = {}
                totalCgst = {}
                totalSgst = {}
                retailerName = {}
                retailerId = {}
                orderNumber = {}

                Ledger names used:
                Party Ledger = {}
                Party Parent Group = {}
                Sales Ledger = {}
                Sales Parent Group = {}
                CGST Ledger = {}
                CGST Parent Group = {}
                SGST Ledger = {}
                SGST Parent Group = {}

                Voucher balance:
                Debit Total = {}
                Credit Total = {}

                FINAL VOUCHER XML SENT TO TALLY:
                {}
                ===== TALLY EXPORT DEBUG END =====
                """,
                invoice.getId(),
                invoiceNumber,
                date,
                grandTotalStr,
                totalTaxableStr,
                totalCgstStr,
                totalSgstStr,
                retailerName,
                retailerId,
                orderNumber,
                retailerName,
                PARTY_PARENT_GROUP,
                SALES_LEDGER,
                SALES_PARENT_GROUP,
                OUTPUT_CGST_LEDGER,
                TAX_PARENT_GROUP,
                OUTPUT_SGST_LEDGER,
                TAX_PARENT_GROUP,
                debitTotal.toPlainString(),
                creditTotal.toPlainString(),
                xml);

        String response = tallyGatewayService.postXmlAndGetResponse(xml);
        log.info("""
                ===== RAW TALLY RESPONSE START =====
                {}
                ===== RAW TALLY RESPONSE END =====
                """, response);
        if (response == null || !response.contains(CREATED_MARKER)) {
            throw new RuntimeException("Tally rejected voucher");
        }
    }

    private static String escapeXml(String value) {
        if (value == null)
            return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
