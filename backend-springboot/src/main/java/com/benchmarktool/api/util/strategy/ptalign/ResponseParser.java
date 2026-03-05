package com.benchmarktool.api.util.strategy.ptalign;

import com.benchmarktool.api.util.strategy.AlignmentResult;
import com.benchmarktool.api.util.strategy.TimingBreakdown;
import com.benchmarktool.api.util.strategy.TraceAlignmentDetail;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parses JSON responses from Python alignment server into domain objects.
 */
public class ResponseParser {
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AlignmentResult parse(String jsonResponse, long totalRequestTimeMs) throws Exception {
        JsonNode json = objectMapper.readTree(jsonResponse);

        if (json.has("error")) {
            throw new RuntimeException("Alignment error: " + json.get("error").asText());
        }

        double avgFitness = json.get("avg_fitness").asDouble();
        double avgCost = json.get("avg_cost").asDouble();
        int successful = json.get("successful_alignments").asInt();
        int failed = json.get("failed_alignments").asInt();
        int totalTraces = json.get("total_traces").asInt();
        int totalVariants = json.get("total_variants").asInt();
        Double shortestPathCost = json.has("shortest_path_cost") ? json.get("shortest_path_cost").asDouble() : null;

        TimingBreakdown timing = parseTiming(json, totalRequestTimeMs);
        AlignmentResult.OptimizationStats stats = parseOptimizationStats(json);
        List<TraceAlignmentDetail> alignments = parseAlignments(json.get("alignments"));
        List<AlignmentResult.BoundsProgressionEntry> boundsProgression = 
            parseBoundsProgression(json.get("bounds_progression"));
        List<AlignmentResult.GlobalBoundsSnapshot> globalBoundsProgression = 
            parseGlobalBoundsProgression(json.get("global_bounds_progression"));

        return AlignmentResult.builder()
            .avgFitness(avgFitness)
            .avgCost(avgCost)
            .totalTraces(totalTraces)
            .totalVariants(totalVariants)
            .successfulAlignments(successful)
            .failedAlignments(failed)
            .shortestPathCost(shortestPathCost)
            .executionTimeMs(totalRequestTimeMs)
            .timing(timing)
            .optimizationStats(stats)
            .alignments(alignments)
            .boundsProgression(boundsProgression)
            .globalBoundsProgression(globalBoundsProgression)
            .build();
    }

    public Map<String, Double> extractVariantCosts(String jsonResponse) throws Exception {
        JsonNode json = objectMapper.readTree(jsonResponse);
        Map<String, Double> costs = new HashMap<>();
        
        if (json.has("variant_costs")) {
            for (Map.Entry<String, JsonNode> entry : json.get("variant_costs").properties()) {
                costs.put(entry.getKey(), entry.getValue().asDouble());
            }
        }
        
        return costs;
    }

    private TimingBreakdown parseTiming(JsonNode json, long totalRequestTimeMs) {
        long parseTimeMs = 0;
        long alignmentTimeMs = 0;
        
        if (json.has("timing")) {
            JsonNode timing = json.get("timing");
            parseTimeMs = timing.has("parse_time_ms") ? timing.get("parse_time_ms").asLong() : 0;
            alignmentTimeMs = timing.has("total_alignment_time_ms") 
                ? timing.get("total_alignment_time_ms").asLong() : 0;
        }

        long networkOverheadMs = totalRequestTimeMs - parseTimeMs - alignmentTimeMs;

        return TimingBreakdown.builder()
            .totalMs(totalRequestTimeMs)
            .computeMs(alignmentTimeMs)
            .parseMs(parseTimeMs)
            .networkMs(Math.max(0, networkOverheadMs))
            .build();
    }

    private AlignmentResult.OptimizationStats parseOptimizationStats(JsonNode json) {
        if (!json.has("optimization_stats")) {
            return null;
        }
        
        JsonNode stats = json.get("optimization_stats");
        return new AlignmentResult.OptimizationStats(
            stats.has("full_alignments") ? stats.get("full_alignments").asInt() : 0,
            stats.has("warm_start_alignments") ? stats.get("warm_start_alignments").asInt() : 0,
            stats.has("bounded_skips") ? stats.get("bounded_skips").asInt() : 0,
            stats.has("cached_alignments") ? stats.get("cached_alignments").asInt() : 0
        );
    }

    private List<TraceAlignmentDetail> parseAlignments(JsonNode alignmentsNode) {
        List<TraceAlignmentDetail> alignments = new ArrayList<>();

        if (alignmentsNode == null || !alignmentsNode.isArray()) {
            return alignments;
        }

        for (JsonNode node : alignmentsNode) {
            List<String> variantName = parseVariantName(node.get("variant_name"));
            
            double cost = node.has("alignment_cost") && !node.get("alignment_cost").isNull()
                ? node.get("alignment_cost").asDouble() : 0.0;
            double fitness = node.get("fitness").asDouble();
            int traceLength = node.get("trace_length").asInt();
            int traceCount = node.get("trace_count").asInt();
            long alignmentTimeMs = node.has("alignment_time_ms") 
                ? node.get("alignment_time_ms").asLong() : 0;
            double lowerBound = node.has("lower_bound") ? node.get("lower_bound").asDouble() : 0;
            double upperBound = node.has("upper_bound") && !node.get("upper_bound").isNull() 
                ? node.get("upper_bound").asDouble() : Double.MAX_VALUE;
            
            TraceAlignmentDetail.AlignmentMethod method = parseMethod(node);

            alignments.add(new TraceAlignmentDetail(
                variantName, cost, fitness, traceLength, traceCount,
                alignmentTimeMs, 0, method, lowerBound, upperBound
            ));
        }

        return alignments;
    }

    private List<String> parseVariantName(JsonNode variantNode) {
        List<String> variantName = new ArrayList<>();
        
        if (variantNode == null) {
            return variantName;
        }
        
        if (variantNode.isArray()) {
            for (JsonNode activity : variantNode) {
                variantName.add(activity.asText());
            }
        } else if (variantNode.isTextual()) {
            String text = variantNode.asText().replaceAll("^\\(|\\)$", "");
            for (String activity : text.split(",\\s*")) {
                variantName.add(activity.replaceAll("^'|'$", "").trim());
            }
        }
        
        return variantName;
    }

    private TraceAlignmentDetail.AlignmentMethod parseMethod(JsonNode node) {
        if (!node.has("method")) {
            return TraceAlignmentDetail.AlignmentMethod.FULL;
        }
        
        return switch (node.get("method").asText()) {
            case "warm_start" -> TraceAlignmentDetail.AlignmentMethod.WARM_START;
            case "bounded_skip" -> TraceAlignmentDetail.AlignmentMethod.BOUNDED_SKIP;
            case "cached" -> TraceAlignmentDetail.AlignmentMethod.CACHED;
            default -> TraceAlignmentDetail.AlignmentMethod.FULL;
        };
    }

    private List<AlignmentResult.BoundsProgressionEntry> parseBoundsProgression(JsonNode node) {
        List<AlignmentResult.BoundsProgressionEntry> entries = new ArrayList<>();

        if (node == null || !node.isArray()) {
            return entries;
        }

        for (JsonNode n : node) {
            entries.add(new AlignmentResult.BoundsProgressionEntry(
                n.has("variant_index") ? n.get("variant_index").asInt() : 0,
                n.has("num_references") ? n.get("num_references").asInt() : 0,
                n.has("lower_bound") ? n.get("lower_bound").asDouble() : 0.0,
                n.has("upper_bound") && !n.get("upper_bound").isNull() ? n.get("upper_bound").asDouble() : null,
                n.has("gap") && !n.get("gap").isNull() ? n.get("gap").asDouble() : null,
                n.has("estimated_cost") && !n.get("estimated_cost").isNull() ? n.get("estimated_cost").asDouble() : null,
                n.has("actual_cost") && !n.get("actual_cost").isNull() ? n.get("actual_cost").asDouble() : null,
                n.has("method") ? n.get("method").asText() : "full"
            ));
        }

        return entries;
    }

    private List<AlignmentResult.GlobalBoundsSnapshot> parseGlobalBoundsProgression(JsonNode node) {
        List<AlignmentResult.GlobalBoundsSnapshot> entries = new ArrayList<>();

        if (node == null || !node.isArray()) {
            return entries;
        }

        for (JsonNode n : node) {
            entries.add(new AlignmentResult.GlobalBoundsSnapshot(
                n.has("num_references") ? n.get("num_references").asInt() : 0,
                n.has("num_remaining") ? n.get("num_remaining").asInt() : 0,
                n.has("mean_lower_bound") ? n.get("mean_lower_bound").asDouble() : 0.0,
                n.has("mean_upper_bound") ? n.get("mean_upper_bound").asDouble() : 0.0,
                n.has("mean_gap") ? n.get("mean_gap").asDouble() : 0.0,
                n.has("min_gap") ? n.get("min_gap").asDouble() : 0.0,
                n.has("max_gap") ? n.get("max_gap").asDouble() : 0.0,
                n.has("num_skippable") ? n.get("num_skippable").asInt() : 0
            ));
        }

        return entries;
    }
}