package com.diya.backend.config;

import com.diya.backend.entity.HsnMaster;
import com.diya.backend.repository.HsnMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class HsnMasterDataLoader implements ApplicationRunner {

    private final HsnMasterRepository hsnMasterRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (hsnMasterRepository.count() > 0) {
            log.debug("HSN master already seeded, skipping.");
            return;
        }

        List<HsnMaster> seed = List.of(
                HsnMaster.builder()
                        .hsnCode("33074100")
                        .description("Incense sticks")
                        .gstRate(new BigDecimal("5.00"))
                        .keywords("agarbathi, incense, dhoop")
                        .build(),
                HsnMaster.builder()
                        .hsnCode("34011190")
                        .description("Soap")
                        .gstRate(new BigDecimal("18.00"))
                        .keywords("soap, bathing soap")
                        .build(),
                HsnMaster.builder()
                        .hsnCode("34022090")
                        .description("Detergent")
                        .gstRate(new BigDecimal("18.00"))
                        .keywords("detergent, washing powder, surf")
                        .build(),
                HsnMaster.builder()
                        .hsnCode("21069099")
                        .description("Namkeen/snacks")
                        .gstRate(new BigDecimal("5.00"))
                        .keywords("mixture, namkeen, chips")
                        .build(),
                HsnMaster.builder()
                        .hsnCode("39249090")
                        .description("Plastic household items")
                        .gstRate(new BigDecimal("18.00"))
                        .keywords("bucket, mug, plastic")
                        .build(),
                HsnMaster.builder()
                        .hsnCode("94054090")
                        .description("LED lights")
                        .gstRate(new BigDecimal("12.00"))
                        .keywords("led, bulb, tube light")
                        .build()
        );

        hsnMasterRepository.saveAll(seed);
        log.info("HSN master seeded with {} records.", seed.size());
    }
}
