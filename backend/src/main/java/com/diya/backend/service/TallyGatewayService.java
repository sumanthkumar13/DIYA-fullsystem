package com.diya.backend.service;

import com.diya.backend.dto.tally.TallyPingResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

@Service
@Slf4j
public class TallyGatewayService {

    private static final String TALLY_URL = "http://localhost:9000";
    private static final Duration TIMEOUT = Duration.ofSeconds(2);

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

    private final RestTemplate tallyRestTemplate;

    public TallyGatewayService(RestTemplateBuilder restTemplateBuilder) {
        this.tallyRestTemplate = restTemplateBuilder
                .connectTimeout(TIMEOUT)
                .readTimeout(TIMEOUT)
                .build();
    }

    /**
     * Verifies Tally is running and returns the first open company name.
     * No credentials, no invoice export. Connectivity check only.
     */
    public TallyPingResponse ping() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/xml"));

            HttpEntity<String> entity = new HttpEntity<>(LIST_COMPANIES_XML, headers);
            ResponseEntity<String> response = tallyRestTemplate.exchange(
                    TALLY_URL,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Optional<String> companyName = parseFirstCompanyName(response.getBody());
                return TallyPingResponse.builder()
                        .connected(true)
                        .companyName(companyName.orElse(null))
                        .build();
            }

            return TallyPingResponse.builder().connected(false).build();
        } catch (ResourceAccessException e) {
            log.debug("Tally not reachable: {}", e.getMessage());
            return TallyPingResponse.builder().connected(false).build();
        } catch (RestClientException e) {
            log.debug("Tally request failed: {}", e.getMessage());
            return TallyPingResponse.builder().connected(false).build();
        } catch (Exception e) {
            log.debug("Tally ping error: {}", e.getMessage());
            return TallyPingResponse.builder().connected(false).build();
        }
    }

    /**
     * Post raw XML to Tally (e.g. IMPORT for ledger creation, voucher).
     * Uses same URL and timeout as ping. Throws on failure.
     */
    public void postXml(String xml) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/xml"));
        HttpEntity<String> entity = new HttpEntity<>(xml, headers);
        log.info("""
                ===== TALLY GATEWAY REQUEST START =====
                {}
                ===== TALLY GATEWAY REQUEST END =====
                """, xml);
        tallyRestTemplate.exchange(TALLY_URL, HttpMethod.POST, entity, String.class);
    }

    /**
     * Post raw XML to Tally and return response body (e.g. to check CREATED status).
     */
    public String postXmlAndGetResponse(String xml) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/xml"));
        HttpEntity<String> entity = new HttpEntity<>(xml, headers);
        log.info("""
                ===== TALLY GATEWAY REQUEST START =====
                {}
                ===== TALLY GATEWAY REQUEST END =====
                """, xml);
        ResponseEntity<String> response = tallyRestTemplate.exchange(
                TALLY_URL, HttpMethod.POST, entity, String.class);
        String responseBody = response.getBody() != null ? response.getBody() : "";
        log.info("""
                ===== TALLY GATEWAY RESPONSE START =====
                HTTP Status = {}
                {}
                ===== TALLY GATEWAY RESPONSE END =====
                """, response.getStatusCode(), responseBody);
        return responseBody;
    }

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
}
