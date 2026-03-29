# Diya -> Tally Integration Analysis

This document describes the **current backend implementation** of Diya's Tally integration based on the code under `backend/src/main/java/com/diya/backend`.

## 1. Tally Integration Architecture

### Main classes

- [TallyGatewayService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyGatewayService.java)
  - Lowest-level transport layer
  - Owns the Tally base URL
  - Sends raw XML over HTTP to Tally
  - Parses ping response to detect whether Tally is reachable and which company is open

- [TallyLedgerService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyLedgerService.java)
  - Builds and sends XML for ledger master creation
  - Ensures required ledgers exist before voucher export:
    - Retailer party ledger
    - Sales ledger
    - Output CGST ledger
    - Output SGST ledger

- [TallyVoucherExportService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyVoucherExportService.java)
  - Main sales voucher exporter
  - Loads finalized invoice
  - Ensures required ledgers exist via `TallyLedgerService`
  - Builds the sales voucher XML
  - Posts it to Tally
  - Marks `invoice.tallyExported = true` only after Tally returns success

- [InvoiceService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/InvoiceService.java)
  - Does **not** call Tally directly
  - Finalizes invoice data inside Diya
  - Computes taxable value, CGST, SGST, grand total
  - Persists `Invoice` and `InvoiceItem` records
  - Tally export is a separate later step

- [InvoiceController.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/controller/InvoiceController.java)
  - Exposes `POST /api/invoices/{invoiceId}/export-tally`
  - Validates invoice access, then delegates to `TallyVoucherExportService`

- [TallyController.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/controller/TallyController.java)
  - Exposes:
    - `GET /api/tally/ping`
    - `GET /api/tally/export/{invoiceId}`
  - Also delegates into `TallyGatewayService` and `TallyVoucherExportService`

### Where the HTTP call to Tally is made

The actual HTTP POST to Tally happens in [TallyGatewayService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyGatewayService.java).

### Tally URL

Current hardcoded URL:

```java
private static final String TALLY_URL = "http://localhost:9000";
```

This means Diya expects Tally to be locally reachable on port `9000`.

## 2. Tally XML Request Builder

### 2.1 Ping XML

File: [TallyGatewayService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyGatewayService.java)

Actual code:

```java
private static final String LIST_COMPANIES_XML = """
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>EXPORT</TALLYREQUEST>
        <TYPE>COLLECTION</TYPE>
        <ID>List of Companies</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
        </DESC>
      </BODY>
    </ENVELOPE>
    """;
```

This is the XML used for Tally connectivity testing.

### 2.2 Ledger creation XML template

File: [TallyLedgerService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyLedgerService.java)

Actual code:

```java
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
```

This is reused for all ledger master creation requests.

### 2.3 Sales voucher XML

File: [TallyVoucherExportService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyVoucherExportService.java)

Actual code:

```java
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
```

## 3. Sales Voucher Export Logic

### Entry points

- [InvoiceController.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/controller/InvoiceController.java)
  - `POST /api/invoices/{invoiceId}/export-tally`
- [TallyController.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/controller/TallyController.java)
  - `GET /api/tally/export/{invoiceId}`

### Export orchestration

File: [TallyVoucherExportService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyVoucherExportService.java)

```java
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
```

### How invoice data is mapped

The sales voucher uses **invoice-level totals only**, not per-item voucher lines.

Actual mapping code:

```java
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
```

### How retailer / party ledger is chosen

```java
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
```

### How GST is calculated

GST is calculated earlier in [InvoiceService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/InvoiceService.java) when the invoice is finalized.

Relevant code:

```java
BigDecimal rate = BigDecimal.valueOf(oi.getUnitPriceSnapshot() != null ? oi.getUnitPriceSnapshot() : 0);
BigDecimal taxableValue = qtySelling.multiply(rate).setScale(SCALE, ROUNDING);

BigDecimal gstRatePct = product.getGstRate() != null ? product.getGstRate() : BigDecimal.ZERO;
BigDecimal totalGst = taxableValue.multiply(gstRatePct).divide(BigDecimal.valueOf(100), SCALE, ROUNDING);
BigDecimal cgst = totalGst.divide(BigDecimal.valueOf(2), SCALE, ROUNDING);
BigDecimal sgst = totalGst.subtract(cgst);
BigDecimal lineTotal = taxableValue.add(totalGst).setScale(SCALE, ROUNDING);

totalTaxable = totalTaxable.add(taxableValue);
totalCgst = totalCgst.add(cgst);
totalSgst = totalSgst.add(sgst);
```

### How order items are mapped

Items are mapped into `InvoiceItem` records during invoice finalization:

```java
InvoiceItem item = InvoiceItem.builder()
        .quantitySellingUnit(qtySelling)
        .quantityBaseUnit(qtyBase)
        .rate(rate)
        .taxableValue(taxableValue)
        .cgst(cgst)
        .sgst(sgst)
        .lineTotal(lineTotal)
        .product(product)
        .build();
itemsToSave.add(item);
```

Important current behavior:

- These invoice items are stored in Diya
- They are exposed in invoice preview
- They are **not** exported as per-item inventory lines into the current Tally voucher XML

### Current sales voucher XML structure

Current generated structure:

```xml
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
      <DATE>yyyyMMdd</DATE>
      <VOUCHERNUMBER>INV-....</VOUCHERNUMBER>
      <NARRATION>Sales via Diya</NARRATION>
      <PARTYLEDGERNAME>Retailer Name</PARTYLEDGERNAME>
      <ALLLEDGERENTRIES.LIST>Party ledger debit</ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>Sales ledger credit</ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>Output CGST credit</ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>Output SGST credit</ALLLEDGERENTRIES.LIST>
     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
```

### Ledger names used in voucher

- Party ledger: retailer display name
- Sales ledger: `Sales`
- GST ledgers:
  - `Output CGST`
  - `Output SGST`

### Important observation

The current voucher is **ledger-summary based**, not inventory-item based. There is no:

- `<INVENTORYENTRIES.LIST>`
- `<STOCKITEMNAME>`
- per-product quantity export
- unit-level export in voucher XML

## 4. Product / Stock Item Sync

### Current state

**Product master sync to Tally is not implemented.**

There is no code generating:

- `<STOCKITEM>`
- stock item import XML
- item master creation calls into Tally

Search results confirm there is no `STOCKITEM` XML builder in the backend.

What does exist:

- `Product` entity has a field:

```java
private Boolean tallyItemSynced = false;
```

- `ProductService` initializes:

```java
.tallyItemSynced(false)
```

But there is currently:

- no service that pushes product masters to Tally
- no update path that flips `tallyItemSynced` to `true`
- no stock item XML generation

## 5. Ledger Creation Logic

### Retailer ledger creation

File: [TallyLedgerService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyLedgerService.java)

```java
public void ensurePartyLedger(String retailerName) {
    if (retailerName == null || retailerName.isBlank()) {
        retailerName = "Retailer";
    }
    String safe = escapeXml(retailerName.trim());
    String xml = String.format(LEDGER_IMPORT_TEMPLATE, safe, safe, escapeXml(SUNDRY_DEBTORS));
    tallyGatewayService.postXml(xml);
    log.trace("Tally: ensured party ledger for {}", retailerName);
}
```

Rendered XML shape:

```xml
<LEDGER NAME="Retailer Name" ACTION="Create">
  <NAME>Retailer Name</NAME>
  <PARENT>Sundry Debtors</PARENT>
</LEDGER>
```

### Sales ledger creation

```java
public void ensureSalesLedger() {
    String xml = String.format(LEDGER_IMPORT_TEMPLATE,
            escapeXml(SALES_LEDGER),
            escapeXml(SALES_LEDGER),
            escapeXml(SALES_ACCOUNTS));
    tallyGatewayService.postXml(xml);
    log.trace("Tally: ensured sales ledger");
}
```

Rendered XML shape:

```xml
<LEDGER NAME="Sales" ACTION="Create">
  <NAME>Sales</NAME>
  <PARENT>Sales Accounts</PARENT>
</LEDGER>
```

### GST ledger creation

```java
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
```

Rendered XML shapes:

```xml
<LEDGER NAME="Output CGST" ACTION="Create">
  <NAME>Output CGST</NAME>
  <PARENT>Duties & Taxes</PARENT>
</LEDGER>
```

```xml
<LEDGER NAME="Output SGST" ACTION="Create">
  <NAME>Output SGST</NAME>
  <PARENT>Duties & Taxes</PARENT>
</LEDGER>
```

### Conclusion

Ledger auto-creation **is implemented** for:

- retailer party ledger
- sales ledger
- CGST ledger
- SGST ledger

## 6. HTTP Communication Layer

File: [TallyGatewayService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyGatewayService.java)

### Client type

Current transport uses **Spring `RestTemplate`** built from `RestTemplateBuilder`.

```java
private final RestTemplate tallyRestTemplate;

public TallyGatewayService(RestTemplateBuilder restTemplateBuilder) {
    this.tallyRestTemplate = restTemplateBuilder
            .connectTimeout(TIMEOUT)
            .readTimeout(TIMEOUT)
            .build();
}
```

### Request headers and body

For ping:

```java
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.parseMediaType("text/xml"));

HttpEntity<String> entity = new HttpEntity<>(LIST_COMPANIES_XML, headers);
ResponseEntity<String> response = tallyRestTemplate.exchange(
        TALLY_URL,
        HttpMethod.POST,
        entity,
        String.class
);
```

For generic XML POST:

```java
public void postXml(String xml) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType("text/xml"));
    HttpEntity<String> entity = new HttpEntity<>(xml, headers);
    tallyRestTemplate.exchange(TALLY_URL, HttpMethod.POST, entity, String.class);
}
```

For generic XML POST with response:

```java
public String postXmlAndGetResponse(String xml) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.parseMediaType("text/xml"));
    HttpEntity<String> entity = new HttpEntity<>(xml, headers);
    ResponseEntity<String> response = tallyRestTemplate.exchange(
            TALLY_URL, HttpMethod.POST, entity, String.class);
    return response.getBody() != null ? response.getBody() : "";
}
```

### Response parsing

#### Ping response parsing

`ping()` parses the returned XML looking for `<NAME>` or `<COMPANYNAME>`:

```java
private Optional<String> parseFirstCompanyName(String xml) {
    try {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
        doc.getDocumentElement().normalize();

        NodeList nameNodes = doc.getElementsByTagName("NAME");
        for (int i = 0; i < nameNodes.getLength(); i++) {
            String text = nameNodes.item(i).getTextContent();
            if (text != null) {
                text = text.trim();
                if (!text.isEmpty()) {
                    return Optional.of(text);
                }
            }
        }

        NodeList companyNameNodes = doc.getElementsByTagName("COMPANYNAME");
        for (int i = 0; i < companyNameNodes.getLength(); i++) {
            String text = companyNameNodes.item(i).getTextContent();
            if (text != null) {
                text = text.trim();
                if (!text.isEmpty()) {
                    return Optional.of(text);
                }
            }
        }
    } catch (Exception e) {
        log.trace("Failed to parse Tally XML: {}", e.getMessage());
    }
    return Optional.empty();
}
```

#### Voucher export response parsing

Voucher export uses simple substring checking:

```java
private static final String CREATED_MARKER = "<CREATED>1</CREATED>";

String response = tallyGatewayService.postXmlAndGetResponse(xml);
if (response == null || !response.contains(CREATED_MARKER)) {
    throw new RuntimeException("Tally rejected voucher");
}
```

### Current transport characteristics

- Protocol: HTTP
- Method: POST
- Content-Type: `text/xml`
- No auth
- No retries
- No TLS
- No response schema validation beyond simple checks
- Timeout: 2 seconds connect/read

## 7. Current Tally Export Flow

### Export flow via invoice screen

```text
User clicks "Export to Tally"
↓
POST /api/invoices/{invoiceId}/export-tally
↓
InvoiceController.exportToTally()
↓
InvoiceService.ensureInvoiceAccess()
↓
TallyVoucherExportService.exportSalesVoucher(invoiceId)
↓
InvoiceRepository.findById(invoiceId)
↓
TallyLedgerService.ensurePartyLedger(retailerName)
↓
TallyLedgerService.ensureSalesLedger()
↓
TallyLedgerService.ensureTaxLedgers()
↓
TallyVoucherExportService.sendVoucherXml(invoice)
↓
TallyGatewayService.postXmlAndGetResponse(xml)
↓
POST http://localhost:9000
↓
If response contains <CREATED>1</CREATED>
↓
invoice.tallyExported = true
↓
InvoiceRepository.save(invoice)
```

### Ping flow

```text
User clicks "Check Tally Connection"
↓
GET /api/tally/ping
↓
TallyController.ping()
↓
TallyGatewayService.ping()
↓
POST http://localhost:9000 with LIST_COMPANIES_XML
↓
parseFirstCompanyName(responseXml)
↓
Return { connected: true/false, companyName }
```

### Where invoice data comes from before export

```text
Order accepted in Diya
↓
Invoice finalized in Diya
↓
InvoiceService computes invoice totals and stores Invoice + InvoiceItems
↓
Later export step uses stored invoice totals
↓
TallyVoucherExportService sends summary voucher to Tally
```

## 8. Known Limitations

- **No product master sync**
  - No stock item XML
  - No item master creation in Tally
  - `tallyItemSynced` exists but is unused

- **Voucher is not itemized**
  - No per-product inventory entries
  - No quantity-wise stock item mapping
  - No unit export in voucher

- **Ledger model is minimal**
  - Only retailer party, sales, CGST, SGST are ensured
  - No dynamic tax ledger naming by rate or tax regime

- **GST classification is basic**
  - Invoice totals are split into CGST and SGST only
  - No IGST handling in current export XML
  - No tax-classification mapping into Tally tax metadata

- **Unit mapping is not exported**
  - `baseUnit`, `sellingUnit`, `unitsPerSelling` are stored in Diya
  - None of them are currently sent to Tally

- **Duplicate protection is invoice-level only**
  - Export is blocked if `invoice.tallyExported == true`
  - No checksum/version comparison
  - No recovery flow if Tally accepted but Diya failed before saving the flag

- **Hardcoded Tally endpoint**
  - URL is fixed at `http://localhost:9000`
  - No environment-based Tally URL configuration

- **No retry or queue**
  - Export is synchronous
  - If Tally is offline, request fails immediately

- **No stock posting to Tally**
  - Diya computes and stores invoice items internally
  - Tally currently receives only accounting voucher data, not stock item data

- **No company selection**
  - Ping only reads the first returned company name
  - Export does not explicitly select company in XML

## File Reference Summary

- [TallyGatewayService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyGatewayService.java)
- [TallyLedgerService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyLedgerService.java)
- [TallyVoucherExportService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/TallyVoucherExportService.java)
- [InvoiceService.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/service/InvoiceService.java)
- [InvoiceController.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/controller/InvoiceController.java)
- [TallyController.java](/c:/Users/suman/Downloads/Diya_app/backend/src/main/java/com/diya/backend/controller/TallyController.java)

## Final Conclusion

The current Diya -> Tally integration is a **summary accounting export**, not yet a full inventory-integrated Tally pipeline.

What exists today:

- Tally connectivity check
- automatic ledger creation
- sales voucher export using finalized invoice totals
- invoice-level duplicate guard via `tallyExported`

What does not exist yet:

- stock item sync
- product master sync
- inventory voucher lines
- advanced GST mapping
- configurable/multi-company export behavior
