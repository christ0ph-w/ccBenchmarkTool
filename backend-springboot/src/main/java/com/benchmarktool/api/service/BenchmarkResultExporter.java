package com.benchmarktool.api.service;

import com.benchmarktool.api.model.BenchmarkResult;
import com.benchmarktool.api.model.LogBenchmarkResult;
import com.benchmarktool.api.util.strategy.AlignmentResult;
import com.benchmarktool.api.util.strategy.TimingBreakdown;
import com.benchmarktool.api.util.strategy.TraceAlignmentDetail;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class BenchmarkResultExporter {
    private static final Logger logger = LogManager.getLogger(BenchmarkResultExporter.class);
    private final ObjectMapper objectMapper;

    public BenchmarkResultExporter() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
    }

    public void exportResult(BenchmarkResult result, String algorithm, String modelFile, String dataDirectory) {
        try {
            Path resultsDir = Paths.get(dataDirectory, "results");
            Files.createDirectories(resultsDir);

            String modelName = removeExtension(modelFile);
            String logName = getLogNameForFilename(result.getLogResults());
            String shortId = result.getBenchmarkId() != null 
                ? result.getBenchmarkId().substring(0, 8) 
                : "unknown";

            // New naming: benchmark_{shortId}_{algorithm}_{model}_{log}.json
            String filename = String.format("benchmark_%s_%s_%s_%s.json", 
                shortId, algorithm, modelName, logName);
            
            Path outputPath = resultsDir.resolve(filename);

            ObjectNode root = buildResultJson(result, algorithm, modelFile, logName);

            objectMapper.writeValue(outputPath.toFile(), root);
            logger.info("Exported benchmark results to: {}", outputPath);

        } catch (Exception e) {
            logger.error("Failed to export benchmark results", e);
        }
    }

    private String getLogNameForFilename(List<LogBenchmarkResult> logResults) {
        if (logResults == null || logResults.isEmpty()) {
            return "unknown";
        }

        if (logResults.size() == 1) {
            String name = logResults.get(0).getLogName();
            return removeExtension(name);
        } else {
            return logResults.size() + "_logs";
        }
    }

    private String removeExtension(String filename) {
        if (filename == null) return "unknown";
        int lastDot = filename.lastIndexOf('.');
        if (lastDot > 0) {
            return filename.substring(0, lastDot);
        }
        return filename;
    }

    private ObjectNode buildResultJson(BenchmarkResult result, String algorithm, String modelFile, String logName) {
        ObjectNode root = objectMapper.createObjectNode();

        // Add benchmark_id to JSON output
        if (result.getBenchmarkId() != null) {
            root.put("benchmark_id", result.getBenchmarkId());
        }
        
        root.put("algorithm", algorithm);
        root.put("model_file", modelFile);
        root.put("log_name", logName);
        root.put("num_threads", result.getNumThreads());
        root.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));

        // Summary section
        ObjectNode summary = objectMapper.createObjectNode();
        List<LogBenchmarkResult> logResults = result.getLogResults();

        if (logResults != null && !logResults.isEmpty()) {
            double totalFitness = 0;
            double totalCost = 0;
            int totalSuccessful = 0;
            int totalFailed = 0;
            int totalTraces = 0;
            int totalVariants = 0;
            long totalComputeMs = 0;

            for (LogBenchmarkResult logResult : logResults) {
                totalFitness += logResult.getAvgFitness() * logResult.getSuccessfulAlignments();
                totalCost += logResult.getAvgCost() * logResult.getSuccessfulAlignments();
                totalSuccessful += logResult.getSuccessfulAlignments();
                totalFailed += logResult.getFailedAlignments();
                totalTraces += logResult.getTotalTraces();
                totalVariants += logResult.getTotalVariants();
                
                if (logResult.getTiming() != null) {
                    totalComputeMs += logResult.getTiming().getComputeMs();
                }
            }

            summary.put("avg_fitness", totalSuccessful > 0 ? totalFitness / totalSuccessful : 0);
            summary.put("avg_cost", totalSuccessful > 0 ? totalCost / totalSuccessful : 0);
            summary.put("successful_alignments", totalSuccessful);
            summary.put("failed_alignments", totalFailed);
            summary.put("total_traces", totalTraces);
            summary.put("total_variants", totalVariants);
            summary.put("total_logs_processed", logResults.size());
            summary.put("total_execution_time_ms", result.getTotalExecutionTimeMs());
            summary.put("total_compute_time_ms", totalComputeMs);
            summary.put("peak_memory_mb", result.getPeakMemoryMb());
        }

        root.set("summary", summary);

        // PTALIGN config section (only for PTALIGN algorithm)
        if (result.getPtalignConfig() != null) {
            ObjectNode configNode = objectMapper.createObjectNode();
            result.getPtalignConfig().forEach((key, value) -> {
                if (value instanceof Boolean) {
                    configNode.put(key, (Boolean) value);
                } else if (value instanceof Double) {
                    configNode.put(key, (Double) value);
                } else if (value instanceof Integer) {
                    configNode.put(key, (Integer) value);
                } else if (value != null) {
                    configNode.put(key, value.toString());
                }
            });
            root.set("ptalign_config", configNode);
        }

        // Logs section
        ObjectNode logsNode = objectMapper.createObjectNode();

        if (logResults != null) {
            for (LogBenchmarkResult logResult : logResults) {
                String logKey = removeExtension(logResult.getLogName());
                ObjectNode logNode = buildLogResultNode(logResult);
                logsNode.set(logKey, logNode);
            }
        }

        root.set("logs", logsNode);

        return root;
    }

    private ObjectNode buildLogResultNode(LogBenchmarkResult logResult) {
        ObjectNode logNode = objectMapper.createObjectNode();

        // Log metadata
        logNode.put("total_traces", logResult.getTotalTraces());
        logNode.put("total_variants", logResult.getTotalVariants());
        logNode.put("successful_alignments", logResult.getSuccessfulAlignments());
        logNode.put("failed_alignments", logResult.getFailedAlignments());
        logNode.put("avg_fitness", logResult.getAvgFitness());
        logNode.put("avg_cost", logResult.getAvgCost());
        logNode.put("execution_time_ms", logResult.getExecutionTimeMs());
        logNode.put("memory_mb", logResult.getMemoryUsedMb());

        // Timing breakdown
        if (logResult.getTiming() != null) {
            ObjectNode timingNode = objectMapper.createObjectNode();
            TimingBreakdown timing = logResult.getTiming();
            timingNode.put("total_ms", timing.getTotalMs());
            timingNode.put("compute_ms", timing.getComputeMs());
            timingNode.put("overhead_ms", timing.getOverheadMs());
            if (timing.getParseMs() != null) {
                timingNode.put("parse_ms", timing.getParseMs());
            }
            if (timing.getNetworkMs() != null) {
                timingNode.put("network_ms", timing.getNetworkMs());
            }
            timingNode.put("efficiency", timing.getEfficiency());
            logNode.set("timing", timingNode);
        }

        // Optimization stats
        if (logResult.getOptimizationStats() != null) {
            ObjectNode statsNode = objectMapper.createObjectNode();
            AlignmentResult.OptimizationStats stats = logResult.getOptimizationStats();
            statsNode.put("full_alignments", stats.getFullAlignments());
            statsNode.put("warm_start_alignments", stats.getWarmStartAlignments());
            statsNode.put("bounded_skips", stats.getBoundedSkips());
            statsNode.put("cached_alignments", stats.getCachedAlignments());
            statsNode.put("optimization_rate", stats.getOptimizationRate());
            logNode.set("optimization_stats", statsNode);
        }

        // Alignments
        ArrayNode alignmentsArray = objectMapper.createArrayNode();
        if (logResult.getAlignments() != null) {
            for (TraceAlignmentDetail alignment : logResult.getAlignments()) {
                ObjectNode alignmentNode = buildAlignmentNode(alignment);
                alignmentsArray.add(alignmentNode);
            }
        }
        logNode.set("alignments", alignmentsArray);

        // Bounds progression (for thesis analysis)
        if (logResult.getBoundsProgression() != null && !logResult.getBoundsProgression().isEmpty()) {
            ArrayNode progressionArray = objectMapper.createArrayNode();
            for (AlignmentResult.BoundsProgressionEntry entry : logResult.getBoundsProgression()) {
                ObjectNode entryNode = buildBoundsProgressionNode(entry);
                progressionArray.add(entryNode);
            }
            logNode.set("bounds_progression", progressionArray);
        }

        // Global bounds progression (for convergence visualization)
        if (logResult.getGlobalBoundsProgression() != null && !logResult.getGlobalBoundsProgression().isEmpty()) {
            ArrayNode globalProgressionArray = objectMapper.createArrayNode();
            for (AlignmentResult.GlobalBoundsSnapshot snapshot : logResult.getGlobalBoundsProgression()) {
                ObjectNode snapshotNode = buildGlobalBoundsSnapshotNode(snapshot);
                globalProgressionArray.add(snapshotNode);
            }
            logNode.set("global_bounds_progression", globalProgressionArray);
        }

        return logNode;
    }

    private ObjectNode buildAlignmentNode(TraceAlignmentDetail alignment) {
        ObjectNode alignmentNode = objectMapper.createObjectNode();

        // Variant name as array
        ArrayNode variantArray = objectMapper.createArrayNode();
        if (alignment.getVariantName() != null) {
            for (String activity : alignment.getVariantName()) {
                variantArray.add(activity);
            }
        }
        alignmentNode.set("variant_name", variantArray);

        // Core metrics
        alignmentNode.put("alignment_cost", alignment.getAlignmentCost());
        alignmentNode.put("fitness", alignment.getFitness());
        alignmentNode.put("trace_length", alignment.getTraceLength());
        alignmentNode.put("trace_count", alignment.getTraceCount());

        // Timing and method
        alignmentNode.put("alignment_time_ms", alignment.getAlignmentTimeMs());
        alignmentNode.put("states_explored", alignment.getStatesExplored());
        alignmentNode.put("method", alignment.getMethod().name().toLowerCase());

        // Bounds info
        alignmentNode.put("lower_bound", alignment.getLowerBound());
        if (alignment.getUpperBound() < Double.MAX_VALUE) {
            alignmentNode.put("upper_bound", alignment.getUpperBound());
        }
        alignmentNode.put("confidence", alignment.getConfidence());

        return alignmentNode;
    }

    private ObjectNode buildBoundsProgressionNode(AlignmentResult.BoundsProgressionEntry entry) {
        ObjectNode entryNode = objectMapper.createObjectNode();

        entryNode.put("variant_index", entry.getVariantIndex());
        entryNode.put("num_references", entry.getNumReferences());
        entryNode.put("lower_bound", entry.getLowerBound());

        if (entry.getUpperBound() != null) {
            entryNode.put("upper_bound", entry.getUpperBound());
        }

        if (entry.getGap() != null) {
            entryNode.put("gap", entry.getGap());
        }

        if (entry.getEstimatedCost() != null) {
            entryNode.put("estimated_cost", entry.getEstimatedCost());
        }

        if (entry.getActualCost() != null) {
            entryNode.put("actual_cost", entry.getActualCost());
        }

        entryNode.put("method", entry.getMethod());

        return entryNode;
    }

    private ObjectNode buildGlobalBoundsSnapshotNode(AlignmentResult.GlobalBoundsSnapshot snapshot) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("num_references", snapshot.getNumReferences());
        node.put("num_remaining", snapshot.getNumRemaining());
        node.put("mean_lower_bound", snapshot.getMeanLowerBound());
        node.put("mean_upper_bound", snapshot.getMeanUpperBound());
        node.put("mean_gap", snapshot.getMeanGap());
        node.put("min_gap", snapshot.getMinGap());
        node.put("max_gap", snapshot.getMaxGap());
        node.put("num_skippable", snapshot.getNumSkippable());
        return node;
    }
}