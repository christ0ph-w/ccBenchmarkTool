package com.benchmarktool.api.util.strategy.ptalign;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * HTTP client for communicating with Python alignment servers.
 */
public class AlignmentClient {
    private static final Logger logger = LogManager.getLogger(AlignmentClient.class);
    private static final Duration TIMEOUT = Duration.ofMinutes(10);
    
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AlignmentClient() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.objectMapper = new ObjectMapper();
    }

    public void loadModel(String serverUrl, String modelPath) throws Exception {
        String requestBody = objectMapper.writeValueAsString(Map.of("model_path", modelPath));
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(serverUrl + "/load-model"))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofMinutes(2))
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to load model: " + response.body());
        }
    }

    public String align(String serverUrl, AlignmentRequest request) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("log_path", request.logPath());
        requestBody.put("use_bounds", request.useBounds());
        requestBody.put("use_warm_start", request.useWarmStart());
        requestBody.put("bound_threshold", request.boundThreshold());
        requestBody.put("bounded_skip_strategy", request.boundedSkipStrategy());
        requestBody.put("collect_global_snapshots", true);
        
        if (request.distanceMatrixPath() != null) {
            requestBody.put("distance_matrix_path", request.distanceMatrixPath());
        }
        
        if (request.priorCosts() != null && !request.priorCosts().isEmpty()) {
            requestBody.put("prior_costs", request.priorCosts());
        }
        
        String body = objectMapper.writeValueAsString(requestBody);
        
        HttpRequest httpRequest = HttpRequest.newBuilder()
            .uri(URI.create(serverUrl + "/align"))
            .header("Content-Type", "application/json")
            .timeout(TIMEOUT)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        
        logger.debug("Sending alignment request to {}", serverUrl);
        
        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() != 200) {
            throw new RuntimeException("Alignment failed: " + response.body());
        }
        
        return response.body();
    }

    /**
     * Request parameters for alignment.
     */
    public record AlignmentRequest(
        String logPath,
        boolean useBounds,
        boolean useWarmStart,
        double boundThreshold,
        String boundedSkipStrategy,
        String distanceMatrixPath,
        Map<String, Double> priorCosts
    ) {}
}