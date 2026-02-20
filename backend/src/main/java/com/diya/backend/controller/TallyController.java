package com.diya.backend.controller;

import com.diya.backend.dto.tally.TallyPingResponse;
import com.diya.backend.service.TallyGatewayService;
import com.diya.backend.service.TallyVoucherExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/tally")
@RequiredArgsConstructor
public class TallyController {

    private final TallyGatewayService tallyGatewayService;
    private final TallyVoucherExportService tallyVoucherExportService;

    @GetMapping("/ping")
    public ResponseEntity<TallyPingResponse> ping() {
        TallyPingResponse response = tallyGatewayService.ping();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export/{invoiceId}")
    public ResponseEntity<String> exportVoucher(@PathVariable UUID invoiceId) {
        tallyVoucherExportService.exportSalesVoucher(invoiceId);
        return ResponseEntity.ok("Exported");
    }
}
