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

    private final InvoiceRepository invoiceRepository;
    private final TallyLedgerService tallyLedgerService;
    private final TallyGatewayService tallyGatewayService;

    /**
     * Export invoice to Tally. Ensures party, sales, and tax ledgers exist, then sends voucher XML.
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
        if (retailer == null) return "Retailer";
        if (retailer.getUser() != null && retailer.getUser().getName() != null && !retailer.getUser().getName().isBlank()) {
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

        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal totalTaxable = invoice.getTotalTaxable() != null ? invoice.getTotalTaxable() : BigDecimal.ZERO;
        BigDecimal totalCgst = invoice.getTotalCgst() != null ? invoice.getTotalCgst() : BigDecimal.ZERO;
        BigDecimal totalSgst = invoice.getTotalSgst() != null ? invoice.getTotalSgst() : BigDecimal.ZERO;

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
                   <LEDGERNAME>Sales</LEDGERNAME>
                   <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                   <AMOUNT>%s</AMOUNT>
                  </ALLLEDGERENTRIES.LIST>
                  <ALLLEDGERENTRIES.LIST>
                   <LEDGERNAME>Output CGST</LEDGERNAME>
                   <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                   <AMOUNT>%s</AMOUNT>
                  </ALLLEDGERENTRIES.LIST>
                  <ALLLEDGERENTRIES.LIST>
                   <LEDGERNAME>Output SGST</LEDGERNAME>
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
                totalTaxableStr,
                totalCgstStr,
                totalSgstStr
            );

        String response = tallyGatewayService.postXmlAndGetResponse(xml);
        if (response == null || !response.contains(CREATED_MARKER)) {
            throw new RuntimeException("Tally rejected voucher");
        }
    }

    private static String escapeXml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
