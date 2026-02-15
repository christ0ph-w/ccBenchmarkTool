package com.benchmarktool.api.util.strategy;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.deckfour.xes.info.impl.XLogInfoImpl;
import org.deckfour.xes.model.XEvent;
import org.deckfour.xes.model.XLog;
import org.deckfour.xes.model.XTrace;
import org.processmining.plugins.petrinet.replayresult.PNRepResult;
import org.processmining.plugins.replayer.replayresult.SyncReplayResult;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Converts ProM's PNRepResult to unified AlignmentResult format.
 * Ensures consistent output format with PTALIGN for fair comparison.
 */
public class PromResultConverter {
    private static final Logger logger = LogManager.getLogger(PromResultConverter.class);

    /**
     * Convert ProM's PNRepResult to unified AlignmentResult with per-variant details.
     *
     * For ILP/Splitpoint algorithms: 
     * - All alignments are "full" (no warm starts or bounded skips)
     * - Bounds are not applicable (confidence = 1.0 for exact results)
     * - States explored is extracted from ProM metrics
     * - No bounds progression (not applicable for these algorithms)
     *
     * @param promResult      The ProM replay result
     * @param log             The original XLog (needed to extract variant names)
     * @param executionTimeMs Total wall-clock execution time
     * @return Unified AlignmentResult with trace details and timing
     */
    public static AlignmentResult convert(PNRepResult promResult, XLog log, long executionTimeMs) {
        List<TraceAlignmentDetail> alignments = new ArrayList<>();

        double totalFitness = 0;
        double totalCost = 0;
        long totalComputeTimeMs = 0;
        int totalTraceCount = 0;
        int successfulAlignments = 0;
        int failedAlignments = 0;

        for (SyncReplayResult alignment : promResult) {
            try {
                // Extract metrics from ProM's info map
                double fitness = extractDouble(alignment, "Trace Fitness", 0);
                double cost = extractDouble(alignment, "Raw Fitness Cost", 0);
                long calcTimeMs = extractLong(alignment, "Calculation Time (ms)", 0);
                int statesExplored = extractInt(alignment, "Num. States", 0);

                // Get trace count (how many traces share this alignment)
                int traceCount = alignment.getTraceIndex().size();

                // Get representative trace to extract variant name
                int representativeIndex = alignment.getTraceIndex().first();
                XTrace trace = log.get(representativeIndex);
                
                List<String> variantName = extractVariantName(trace);
                int traceLength = trace.size();

                // Create detail record
                // For ILP/Splitpoint:  method=FULL, bounds not applicable, confidence=1.0
                TraceAlignmentDetail detail = new TraceAlignmentDetail(
                        variantName,
                        cost,
                        fitness,
                        traceLength,
                        traceCount,
                        calcTimeMs,
                        statesExplored,
                        TraceAlignmentDetail.AlignmentMethod.FULL,
                        cost,             // lowerBound = actual cost (exact result)
                        cost,             // upperBound = actual cost (exact result)
                        1.0               // confidence = 1.0 (exact result)
                );
                alignments.add(detail);

                // Aggregate totals (weighted by trace count)
                totalFitness += fitness * traceCount;
                totalCost += cost * traceCount;
                totalComputeTimeMs += calcTimeMs;
                totalTraceCount += traceCount;
                successfulAlignments += traceCount;

            } catch (Exception e) {
                logger.warn("Error parsing alignment info:  {}", e.getMessage());
                failedAlignments++;
            }
        }

        // Calculate averages
        double avgFitness = totalTraceCount > 0 ? totalFitness / totalTraceCount : 0;
        double avgCost = totalTraceCount > 0 ?  totalCost / totalTraceCount :  0;

        // Build timing breakdown
        long overheadMs = executionTimeMs - totalComputeTimeMs;
        TimingBreakdown timing = TimingBreakdown.builder()
                .totalMs(executionTimeMs)
                .computeMs(totalComputeTimeMs)
                .overheadMs(Math.max(0, overheadMs))
                .parseMs(0L)
                .networkMs(0L)
                .build();

        // Create optimization stats - for ILP/Splitpoint, all alignments are "full"
        AlignmentResult.OptimizationStats optimizationStats = new AlignmentResult.OptimizationStats(
                alignments.size(),  // fullAlignments = all variants
                0,                  // warmStartAlignments = 0
                0,                  // boundedSkips = 0
                0                   // cachedAlignments = 0
        );

        logger.info("ProM alignment complete:  {} variants, {}ms total, {}ms compute, {:.1f}% efficiency",
                alignments.size(), executionTimeMs, totalComputeTimeMs, timing.getEfficiency() * 100);

        // No bounds progression for ILP/Splitpoint (not applicable)
        List<AlignmentResult.BoundsProgressionEntry> emptyBoundsProgression = Collections.emptyList();

        return AlignmentResult.builder()
                .avgFitness(avgFitness)
                .avgCost(avgCost)
                .totalTraces(totalTraceCount)
                .totalVariants(alignments.size())
                .successfulAlignments(successfulAlignments)
                .failedAlignments(failedAlignments)
                .executionTimeMs(executionTimeMs)
                .timing(timing)
                .optimizationStats(optimizationStats)
                .alignments(alignments)
                .boundsProgression(emptyBoundsProgression)
                .build();
    }

    private static double extractDouble(SyncReplayResult alignment, String key, double defaultValue) {
        Object value = alignment.getInfo().get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return defaultValue;
    }

    private static long extractLong(SyncReplayResult alignment, String key, long defaultValue) {
        Object value = alignment.getInfo().get(key);
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return defaultValue;
    }

    private static int extractInt(SyncReplayResult alignment, String key, int defaultValue) {
        Object value = alignment.getInfo().get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return defaultValue;
    }

    private static List<String> extractVariantName(XTrace trace) {
        List<String> activities = new ArrayList<>();
        for (XEvent event : trace) {
            String activityName = XLogInfoImpl.NAME_CLASSIFIER.getClassIdentity(event);
            activities.add(activityName);
        }
        return activities;
    }
}