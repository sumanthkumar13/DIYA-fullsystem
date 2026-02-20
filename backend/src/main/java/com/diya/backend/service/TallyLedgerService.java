package com.diya.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Ensures required ledgers exist in Tally before voucher export.
 * Safe to call every time; Tally ignores duplicate ledger names.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TallyLedgerService {

    private static final String LEDGER_IMPORT_TEMPLATE = """
        <ENVELOPE>
         <HEADER>
          <TALLYREQUEST>IMPORT</TALLYREQUEST>
         </HEADER>
         <BODY>
          <IMPORTDATA>
           <REQUESTDESC>
            <REPORTNAME>All Masters</REPORTNAME>
           </REQUESTDESC>
           <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
             <LEDGER NAME="%s" ACTION="Create">
              <NAME>%s</NAME>
              <PARENT>%s</PARENT>
             </LEDGER>
            </TALLYMESSAGE>
           </REQUESTDATA>
          </IMPORTDATA>
         </BODY>
        </ENVELOPE>
        """;

    private static final String SUNDRY_DEBTORS = "Sundry Debtors";
    private static final String SALES_ACCOUNTS = "Sales Accounts";
    private static final String DUTIES_AND_TAXES = "Duties & Taxes";

    private static final String SALES_LEDGER = "Sales";
    private static final String OUTPUT_CGST = "Output CGST";
    private static final String OUTPUT_SGST = "Output SGST";

    private final TallyGatewayService tallyGatewayService;

    public void ensurePartyLedger(String retailerName) {
        if (retailerName == null || retailerName.isBlank()) {
            retailerName = "Retailer";
        }
        String safe = escapeXml(retailerName.trim());
        String xml = String.format(LEDGER_IMPORT_TEMPLATE, safe, safe, escapeXml(SUNDRY_DEBTORS));
        tallyGatewayService.postXml(xml);
        log.trace("Tally: ensured party ledger for {}", retailerName);
    }

    public void ensureSalesLedger() {
        String xml = String.format(LEDGER_IMPORT_TEMPLATE,
                escapeXml(SALES_LEDGER),
                escapeXml(SALES_LEDGER),
                escapeXml(SALES_ACCOUNTS));
        tallyGatewayService.postXml(xml);
        log.trace("Tally: ensured sales ledger");
    }

    public void ensureTaxLedgers() {
        String group = escapeXml(DUTIES_AND_TAXES);
        String cgstXml = String.format(LEDGER_IMPORT_TEMPLATE,
                escapeXml(OUTPUT_CGST),
                escapeXml(OUTPUT_CGST),
                group);
        tallyGatewayService.postXml(cgstXml);
        String sgstXml = String.format(LEDGER_IMPORT_TEMPLATE,
                escapeXml(OUTPUT_SGST),
                escapeXml(OUTPUT_SGST),
                group);
        tallyGatewayService.postXml(sgstXml);
        log.trace("Tally: ensured tax ledgers (Output CGST, Output SGST)");
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
