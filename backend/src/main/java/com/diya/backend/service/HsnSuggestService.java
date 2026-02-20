package com.diya.backend.service;

import com.diya.backend.dto.hsn.HsnSuggestResponse;
import com.diya.backend.entity.HsnMaster;
import com.diya.backend.repository.HsnMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HsnSuggestService {

    private static final Pattern NON_ALPHA = Pattern.compile("[^a-z\\s]+");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private final HsnMasterRepository hsnMasterRepository;

    /**
     * Suggests HSN code and GST rate from product name. Does not modify any product; suggestion only.
     */
    public HsnSuggestResponse suggest(String productName) {
        if (productName == null || productName.isBlank()) {
            return emptyResponse();
        }

        List<String> words = normalizeAndSplit(productName);
        if (words.isEmpty()) {
            return emptyResponse();
        }

        List<HsnMaster> all = hsnMasterRepository.findAllByOrderByHsnCode();
        if (all.isEmpty()) {
            return emptyResponse();
        }

        MatchResult best = null;
        for (HsnMaster master : all) {
            List<String> keywords = parseKeywords(master.getKeywords());
            MatchResult result = scoreMatch(words, keywords, master);
            if (result != null && (best == null || result.score > best.score)) {
                best = result;
            }
        }

        if (best == null) {
            return emptyResponse();
        }

        HsnMaster m = best.master;
        return HsnSuggestResponse.builder()
                .hsnCode(m.getHsnCode())
                .gstRate(m.getGstRate())
                .description(m.getDescription())
                .confidence(best.confidence)
                .matchedKeyword(best.matchedKeyword)
                .build();
    }

    private List<String> normalizeAndSplit(String input) {
        String lower = input.trim().toLowerCase();
        String noNumbers = lower.replaceAll("\\d+", " ");
        String alphaOnly = NON_ALPHA.matcher(noNumbers).replaceAll(" ");
        String normalized = WHITESPACE.matcher(alphaOnly).replaceAll(" ").trim();
        if (normalized.isEmpty()) {
            return Collections.emptyList();
        }
        return Arrays.stream(normalized.split(" "))
                .filter(w -> w.length() > 0)
                .collect(Collectors.toList());
    }

    private List<String> parseKeywords(String keywords) {
        if (keywords == null || keywords.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(keywords.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .collect(Collectors.toList());
    }

    private MatchResult scoreMatch(List<String> words, List<String> keywords, HsnMaster master) {
        int exactMatches = 0;
        int partialMatches = 0;
        String matchedKeyword = null;

        for (String word : words) {
            if (word.length() < 2) continue;
            for (String kw : keywords) {
                if (word.equals(kw)) {
                    exactMatches++;
                    if (matchedKeyword == null) matchedKeyword = kw;
                    break;
                }
                if (kw.contains(word) || word.contains(kw)) {
                    partialMatches++;
                    if (matchedKeyword == null) matchedKeyword = kw;
                    break;
                }
            }
        }

        if (exactMatches == 0 && partialMatches == 0) {
            return null;
        }

        String confidence = exactMatches > 0 ? "HIGH" : "MEDIUM";
        int score = exactMatches * 10 + partialMatches;
        return new MatchResult(master, score, confidence, matchedKeyword);
    }

    private HsnSuggestResponse emptyResponse() {
        return HsnSuggestResponse.builder()
                .hsnCode(null)
                .gstRate(null)
                .description(null)
                .confidence("LOW")
                .matchedKeyword(null)
                .build();
    }

    private static class MatchResult {
        final HsnMaster master;
        final int score;
        final String confidence;
        final String matchedKeyword;

        MatchResult(HsnMaster master, int score, String confidence, String matchedKeyword) {
            this.master = master;
            this.score = score;
            this.confidence = confidence;
            this.matchedKeyword = matchedKeyword;
        }
    }
}
