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

    public void exportResult(BenchmarkResult result, String algorithm, String modelFile, String logDirectory) {
        try {
            Path logDirPath = Paths.get(logDirectory);
            Path dataDirectory = logDirPath.getParent();
            Path resultsDir = dataDirectory.resolve("results");
            Files.createDirectories(resultsDir);

            String modelName = removeExtension(modelFile);
            String logDirName = logDirPath.getFileName().toString();
            String baseLogName = extractBaseLogName(logDirName);
            int logCount = result.getLogResults() != null ? result.getLogResults().size() : 0;
            
            String shortId = result.getBenchmarkId() != null 
                ? result.getBenchmarkId().substring(0, 8) 
                : "unknown";

            String filename = String.format("benchmark_%s_%s_%s_%d_logs.json", 
                shortId, algorithm, modelName, logCount);
            
            Path outputPath = resultsDir.resolve(filename);

            ObjectNode root = buildResultJson(result, algorithm, modelFile, baseLogName, logDirName, logCount);

            objectMapper.writeValue(outputPath.toFile(), root);
            logger.info("Exported benchmark results to: {}", outputPath);

        } catch (Exception e) {
            logger.error("Failed to export benchmark results", e);
        }
    }

    private String extractBaseLogName(String dirName) {
        String[] splitPatterns = {"_hierarchical_", "_dbscan_", "_random_variant_split_", "_random_split_"};
        
        for (String pattern : splitPatterns) {
            int idx = dirName.indexOf(pattern);
            if (idx > 0) {
                return dirName.substring(0, idx);
            }
        }
        
        return dirName;
    }

    private String removeExtension(String filename) {
        if (filename == null) return "unknown";
        int lastDot = filename.lastIndexOf('.');
        if (lastDot > 0) {
            return filename.substring(0, lastDot);
        }
        return filename;
    }

    private ObjectNode buildResultJson(BenchmarkResult result, String algorithm, String modelFile, 
                                        String baseLogName, String logDirectory, int logCount) {
        ObjectNode root = objectMapper.createObjectNode();

        if (result.getBenchmarkId() != null) {
            root.put("benchmarkId", result.getBenchmarkId());
        }
        
        root.put("algorithm", algorithm);
        root.put("modelFile", modelFile);
        root.put("logName", baseLogName);
        root.put("logDirectory", logDirectory);
        root.put("logCount", logCount);
        root.put("numThreads", result.getNumThreads());
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

            summary.put("avgFitness", totalSuccessful > 0 ? totalFitness / totalSuccessful : 0);
            summary.put("avgCost", totalSuccessful > 0 ? totalCost / totalSuccessful : 0);
            summary.put("successfulAlignments", totalSuccessful);
            summary.put("failedAlignments", totalFailed);
            summary.put("totalTraces", totalTraces);
            summary.put("totalVariants", totalVariants);
            summary.put("totalLogsProcessed", logResults.size());
            summary.put("totalExecutionTimeMs", result.getTotalExecutionTimeMs());
            summary.put("totalComputeTimeMs", totalComputeMs);
            summary.put("peakMemoryMb", result.getPeakMemoryMb());
        }

        root.set("summary", summary);

        // PTALIGN config section
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
            root.set("ptalignConfig", configNode);
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

        logNode.put("totalTraces", logResult.getTotalTraces());
        logNode.put("totalVariants", logResult.getTotalVariants());
        logNode.put("successfulAlignments", logResult.getSuccessfulAlignments());
        logNode.put("failedAlignments", logResult.getFailedAlignments());
        logNode.put("avgFitness", logResult.getAvgFitness());
        logNode.put("avgCost", logResult.getAvgCost());
        if (logResult.getShortestPathCost() != null) {
            logNode.put("shortestPathCost", logResult.getShortestPathCost());
        }
        logNode.put("executionTimeMs", logResult.getExecutionTimeMs());
        logNode.put("memoryUsedMb", logResult.getMemoryUsedMb());

        if (logResult.getTiming() != null) {
            ObjectNode timingNode = objectMapper.createObjectNode();
            TimingBreakdown timing = logResult.getTiming();
            timingNode.put("totalMs", timing.getTotalMs());
            timingNode.put("computeMs", timing.getComputeMs());
            timingNode.put("overheadMs", timing.getOverheadMs());
            if (timing.getParseMs() != null) {
                timingNode.put("parseMs", timing.getParseMs());
            }
            if (timing.getNetworkMs() != null) {
                timingNode.put("networkMs", timing.getNetworkMs());
            }
            timingNode.put("efficiency", timing.getEfficiency());
            logNode.set("timing", timingNode);
        }

        if (logResult.getOptimizationStats() != null) {
            ObjectNode statsNode = objectMapper.createObjectNode();
            AlignmentResult.OptimizationStats stats = logResult.getOptimizationStats();
            statsNode.put("fullAlignments", stats.getFullAlignments());
            statsNode.put("warmStartAlignments", stats.getWarmStartAlignments());
            statsNode.put("boundedSkips", stats.getBoundedSkips());
            statsNode.put("cachedAlignments", stats.getCachedAlignments());
            statsNode.put("optimizationRate", stats.getOptimizationRate());
            logNode.set("optimizationStats", statsNode);
        }

        ArrayNode alignmentsArray = objectMapper.createArrayNode();
        if (logResult.getAlignments() != null) {
            for (TraceAlignmentDetail alignment : logResult.getAlignments()) {
                ObjectNode alignmentNode = buildAlignmentNode(alignment);
                alignmentsArray.add(alignmentNode);
            }
        }
        logNode.set("alignments", alignmentsArray);

        if (logResult.getBoundsProgression() != null && !logResult.getBoundsProgression().isEmpty()) {
            ArrayNode progressionArray = objectMapper.createArrayNode();
            for (AlignmentResult.BoundsProgressionEntry entry : logResult.getBoundsProgression()) {
                ObjectNode entryNode = buildBoundsProgressionNode(entry);
                progressionArray.add(entryNode);
            }
            logNode.set("boundsProgression", progressionArray);
        }

        if (logResult.getGlobalBoundsProgression() != null && !logResult.getGlobalBoundsProgression().isEmpty()) {
            ArrayNode globalProgressionArray = objectMapper.createArrayNode();
            for (AlignmentResult.GlobalBoundsSnapshot snapshot : logResult.getGlobalBoundsProgression()) {
                ObjectNode snapshotNode = buildGlobalBoundsSnapshotNode(snapshot);
                globalProgressionArray.add(snapshotNode);
            }
            logNode.set("globalBoundsProgression", globalProgressionArray);
        }

        return logNode;
    }

    private ObjectNode buildAlignmentNode(TraceAlignmentDetail alignment) {
        ObjectNode alignmentNode = objectMapper.createObjectNode();

        ArrayNode variantArray = objectMapper.createArrayNode();
        if (alignment.getVariantName() != null) {
            for (String activity : alignment.getVariantName()) {
                variantArray.add(activity);
            }
        }
        alignmentNode.set("variantName", variantArray);

        alignmentNode.put("alignmentCost", alignment.getAlignmentCost());
        alignmentNode.put("fitness", alignment.getFitness());
        alignmentNode.put("traceLength", alignment.getTraceLength());
        alignmentNode.put("traceCount", alignment.getTraceCount());

        alignmentNode.put("alignmentTimeMs", alignment.getAlignmentTimeMs());
        alignmentNode.put("statesExplored", alignment.getStatesExplored());
        alignmentNode.put("method", alignment.getMethod().name().toLowerCase());

        alignmentNode.put("lowerBound", alignment.getLowerBound());
        if (alignment.getUpperBound() < Double.MAX_VALUE) {
            alignmentNode.put("upperBound", alignment.getUpperBound());
        }
        alignmentNode.put("confidence", alignment.getConfidence());

        return alignmentNode;
    }

    private ObjectNode buildBoundsProgressionNode(AlignmentResult.BoundsProgressionEntry entry) {
        ObjectNode entryNode = objectMapper.createObjectNode();

        entryNode.put("variantIndex", entry.getVariantIndex());
        entryNode.put("numReferences", entry.getNumReferences());
        entryNode.put("lowerBound", entry.getLowerBound());

        if (entry.getUpperBound() != null) {
            entryNode.put("upperBound", entry.getUpperBound());
        }

        if (entry.getGap() != null) {
            entryNode.put("gap", entry.getGap());
        }

        if (entry.getEstimatedCost() != null) {
            entryNode.put("estimatedCost", entry.getEstimatedCost());
        }

        if (entry.getActualCost() != null) {
            entryNode.put("actualCost", entry.getActualCost());
        }

        entryNode.put("method", entry.getMethod());

        return entryNode;
    }

    private ObjectNode buildGlobalBoundsSnapshotNode(AlignmentResult.GlobalBoundsSnapshot snapshot) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("numReferences", snapshot.getNumReferences());
        node.put("numRemaining", snapshot.getNumRemaining());
        node.put("meanLowerBound", snapshot.getMeanLowerBound());
        node.put("meanUpperBound", snapshot.getMeanUpperBound());
        node.put("meanGap", snapshot.getMeanGap());
        node.put("minGap", snapshot.getMinGap());
        node.put("maxGap", snapshot.getMaxGap());
        node.put("numSkippable", snapshot.getNumSkippable());
        return node;
    }
}