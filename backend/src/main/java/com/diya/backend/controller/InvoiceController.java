package com.diya.backend.controller;

import com.diya.backend.dto.invoice.InvoiceFinalizeResponse;
import com.diya.backend.dto.invoice.InvoicePreviewDTO;
import com.diya.backend.service.InvoiceService;
import com.diya.backend.service.TallyVoucherExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final TallyVoucherExportService tallyVoucherExportService;

    @PostMapping("/{orderId}/finalize")
    public ResponseEntity<InvoiceFinalizeResponse> finalize(
            @PathVariable UUID orderId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        InvoiceFinalizeResponse response = invoiceService.finalizeInvoice(identifier, orderId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{invoiceId}")
    public ResponseEntity<InvoicePreviewDTO> getInvoice(@PathVariable UUID invoiceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        try {
            InvoicePreviewDTO dto = invoiceService.getInvoicePreview(identifier, invoiceId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            if ("Invoice not found".equals(e.getMessage())) {
                return ResponseEntity.notFound().build();
            }
            throw e;
        }
    }

    @PostMapping("/{invoiceId}/export-tally")
    public ResponseEntity<Void> exportToTally(@PathVariable UUID invoiceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String identifier = auth.getName();
        invoiceService.ensureInvoiceAccess(identifier, invoiceId);
        tallyVoucherExportService.exportSalesVoucher(invoiceId);
        return ResponseEntity.ok().build();
    }
}
