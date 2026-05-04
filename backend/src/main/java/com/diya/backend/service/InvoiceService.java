package com.diya.backend.service;

import com.diya.backend.dto.invoice.InvoiceFinalizeResponse;
import com.diya.backend.dto.invoice.InvoicePreviewDTO;
import com.diya.backend.entity.*;
import com.diya.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final WholesalerRepository wholesalerRepository;

    /**
     * Finalize invoice for an order: create invoice record and items with GST,
     * update order status to INVOICED. Stock and ledger are handled at order acceptance time.
     */
    @Transactional
    public InvoiceFinalizeResponse finalizeInvoice(String identifier, UUID orderId) {
        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (!order.getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Access denied: Order not linked to this wholesaler");
        }

        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            throw new RuntimeException("Order has no items");
        }

        if (invoiceRepository.existsByOrderId(orderId)) {
            throw new RuntimeException("Invoice already exists for this order");
        }

        if (order.getStatus() == Order.Status.CANCELLED || order.getStatus() == Order.Status.REJECTED) {
            throw new RuntimeException("Cannot finalize invoice for cancelled or rejected order");
        }

        if (order.getStatus() != Order.Status.ACCEPTED
                && order.getStatus() != Order.Status.DISPATCHED
                && order.getStatus() != Order.Status.DELIVERED) {
            throw new RuntimeException("Invoice can only be generated for ACCEPTED, DISPATCHED or DELIVERED orders");
        }

        BigDecimal totalTaxable = BigDecimal.ZERO;
        BigDecimal totalCgst = BigDecimal.ZERO;
        BigDecimal totalSgst = BigDecimal.ZERO;
        List<InvoiceItem> itemsToSave = new ArrayList<>();

        for (OrderItem oi : order.getOrderItems()) {
            UUID productId = oi.getProduct() != null ? oi.getProduct().getId() : oi.getProductIdSnapshot();
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

            int qty = oi.getQty() != null ? oi.getQty() : 0;
            if (qty <= 0) continue;

            BigDecimal qtySelling = BigDecimal.valueOf(qty);
            int unitsPerSelling = (product.getUnitsPerSelling() != null && product.getUnitsPerSelling() > 0)
                    ? product.getUnitsPerSelling() : 1;
            BigDecimal qtyBase = qtySelling.multiply(BigDecimal.valueOf(unitsPerSelling));

            int stock = product.getStock() != null ? product.getStock() : 0;
            int reserved = product.getReservedStock() != null ? product.getReservedStock() : 0;
            int available = stock - reserved;
            if (qtyBase.intValue() > available) {
                throw new RuntimeException("Insufficient stock for product: " + product.getName()
                        + " (required base units: " + qtyBase + ", available: " + available + ")");
            }

            BigDecimal rate = oi.getUnitPriceSnapshot() != null ? oi.getUnitPriceSnapshot() : BigDecimal.ZERO;
            BigDecimal taxableValue = qtySelling.multiply(rate).setScale(SCALE, ROUNDING);

            BigDecimal gstRatePct = product.getGstRate() != null ? product.getGstRate() : BigDecimal.ZERO;
            BigDecimal totalGst = taxableValue.multiply(gstRatePct).divide(BigDecimal.valueOf(100), SCALE, ROUNDING);
            BigDecimal cgst = totalGst.divide(BigDecimal.valueOf(2), SCALE, ROUNDING);
            BigDecimal sgst = totalGst.subtract(cgst);
            BigDecimal lineTotal = taxableValue.add(totalGst).setScale(SCALE, ROUNDING);

            totalTaxable = totalTaxable.add(taxableValue);
            totalCgst = totalCgst.add(cgst);
            totalSgst = totalSgst.add(sgst);

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
        }

        BigDecimal grandTotal = totalTaxable.add(totalCgst).add(totalSgst).setScale(SCALE, ROUNDING);

        String invoiceNumber = nextInvoiceNumber();
        LocalDateTime now = LocalDateTime.now();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .order(order)
                .retailer(order.getRetailer())
                .invoiceDate(now)
                .status(Invoice.InvoiceStatus.FINALIZED)
                .totalTaxable(totalTaxable)
                .totalCgst(totalCgst)
                .totalSgst(totalSgst)
                .grandTotal(grandTotal)
                .build();
        invoice = invoiceRepository.save(invoice);

        for (InvoiceItem item : itemsToSave) {
            item.setInvoice(invoice);
            invoiceItemRepository.save(item);
        }

        order.setStatus(Order.Status.INVOICED);
        orderRepository.save(order);

        return InvoiceFinalizeResponse.builder()
                .invoiceId(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .grandTotal(invoice.getGrandTotal())
                .build();
    }

    /**
     * Ensures the current user (wholesaler) has access to the invoice. Throws if not found or not owner.
     */
    @Transactional(readOnly = true)
    public void ensureInvoiceAccess(String identifier, UUID invoiceId) {
        Wholesaler wholesaler = identifier.contains("@")
                ? wholesalerRepository.findByUserEmail(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"))
                : wholesalerRepository.findByUserPhone(identifier)
                .orElseThrow(() -> new RuntimeException("Wholesaler not found"));

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (!invoice.getOrder().getWholesaler().getId().equals(wholesaler.getId())) {
            throw new RuntimeException("Invoice not found");
        }
    }

    /**
     * Read-only invoice preview. Only the wholesaler who owns the order can access.
     * Returns stored values only; no recalculation.
     */
    @Transactional(readOnly = true)
    public InvoicePreviewDTO getInvoicePreview(String identifier, UUID invoiceId) {
        ensureInvoiceAccess(identifier, invoiceId);
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        String retailerName = "Unknown";
        if (invoice.getRetailer() != null) {
            if (invoice.getRetailer().getUser() != null && invoice.getRetailer().getUser().getName() != null) {
                retailerName = invoice.getRetailer().getUser().getName();
            } else if (invoice.getRetailer().getShopName() != null) {
                retailerName = invoice.getRetailer().getShopName();
            }
        }

        List<InvoiceItem> invoiceItems = invoiceItemRepository.findByInvoiceId(invoiceId);
        List<InvoicePreviewDTO.InvoicePreviewItemDTO> itemDtos = new ArrayList<>();
        for (InvoiceItem item : invoiceItems) {
                Product p = item.getProduct();
                String productName = p != null ? p.getName() : "Product";
                String hsnCode = p != null && p.getHsnCode() != null ? p.getHsnCode() : "";
                String sellingUnit = p != null && p.getSellingUnit() != null ? p.getSellingUnit() : "";

                itemDtos.add(InvoicePreviewDTO.InvoicePreviewItemDTO.builder()
                        .productName(productName)
                        .hsnCode(hsnCode)
                        .quantitySellingUnit(item.getQuantitySellingUnit())
                        .sellingUnit(sellingUnit)
                        .rate(item.getRate())
                        .taxableValue(item.getTaxableValue())
                        .cgst(item.getCgst())
                        .sgst(item.getSgst())
                        .lineTotal(item.getLineTotal())
                        .build());
        }

        return InvoicePreviewDTO.builder()
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceDate(invoice.getInvoiceDate())
                .retailerName(retailerName)
                .items(itemDtos)
                .totalTaxable(invoice.getTotalTaxable())
                .totalCgst(invoice.getTotalCgst())
                .totalSgst(invoice.getTotalSgst())
                .grandTotal(invoice.getGrandTotal())
                .tallyExported(invoice.getTallyExported())
                .build();
    }

    private String nextInvoiceNumber() {
        int year = Year.now().getValue();
        String prefix = "INV-" + year + "-";
        List<Invoice> existing = invoiceRepository.findByInvoiceNumberStartingWithOrderByInvoiceNumberDesc(prefix);
        int nextSeq = 1;
        if (!existing.isEmpty()) {
            String last = existing.get(0).getInvoiceNumber();
            if (last != null && last.startsWith(prefix)) {
                try {
                    String numPart = last.substring(prefix.length());
                    nextSeq = Integer.parseInt(numPart) + 1;
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return prefix + String.format("%05d", nextSeq);
    }
}
