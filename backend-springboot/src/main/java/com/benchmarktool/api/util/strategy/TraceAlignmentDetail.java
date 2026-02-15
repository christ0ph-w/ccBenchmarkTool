package com.benchmarktool.api.util.strategy;

import java.util.List;

/**
 * Details about a single variant's alignment result.
 * Used by all alignment algorithms for consistent output format.
 */
public class TraceAlignmentDetail {
    
    public enum AlignmentMethod {
        FULL,           // Complete alignment computed from scratch
        WARM_START,     // Alignment computed with Gurobi warm start from reference
        BOUNDED_SKIP,   // Alignment skipped, cost estimated from bounds
        CACHED          // Alignment reused from prior cluster
    }

    private final List<String> variantName;
    private final double alignmentCost;
    private final double fitness;
    private final int traceLength;
    private final int traceCount;
    private final long alignmentTimeMs;
    private final int statesExplored;
    private final AlignmentMethod method;
    private final double lowerBound;
    private final double upperBound;
    private final double confidence;

    public TraceAlignmentDetail(List<String> variantName, double alignmentCost, double fitness,
                                int traceLength, int traceCount, long alignmentTimeMs,
                                int statesExplored, AlignmentMethod method,
                                double lowerBound, double upperBound, double confidence) {
        this.variantName = variantName;
        this.alignmentCost = alignmentCost;
        this.fitness = fitness;
        this.traceLength = traceLength;
        this.traceCount = traceCount;
        this.alignmentTimeMs = alignmentTimeMs;
        this.statesExplored = statesExplored;
        this.method = method;
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
        this.confidence = confidence;
    }

    /**
     * Constructor without confidence (defaults to 1.0 for exact alignments)
     */
    public TraceAlignmentDetail(List<String> variantName, double alignmentCost, double fitness,
                                int traceLength, int traceCount, long alignmentTimeMs,
                                int statesExplored, AlignmentMethod method,
                                double lowerBound, double upperBound) {
        this(variantName, alignmentCost, fitness, traceLength, traceCount,
             alignmentTimeMs, statesExplored, method, lowerBound, upperBound,
             computeDefaultConfidence(method, lowerBound, upperBound));
    }

    /**
     * Compute default confidence based on method and bounds.
     */
    private static double computeDefaultConfidence(AlignmentMethod method, 
                                                   double lowerBound, double upperBound) {
        if (method == AlignmentMethod.BOUNDED_SKIP) {
            // For skipped alignments, confidence based on bound tightness
            if (upperBound <= 0 || upperBound == Double.MAX_VALUE) {
                return 0.0;
            }
            // Ratio of lower to upper bound (1.0 when bounds are equal)
            return lowerBound / upperBound;
        }
        // Exact alignment computed
        return 1.0;
    }

    // Getters
    public List<String> getVariantName() { return variantName; }
    public double getAlignmentCost() { return alignmentCost; }
    public double getFitness() { return fitness; }
    public int getTraceLength() { return traceLength; }
    public int getTraceCount() { return traceCount; }
    public long getAlignmentTimeMs() { return alignmentTimeMs; }
    public int getStatesExplored() { return statesExplored; }
    public AlignmentMethod getMethod() { return method; }
    public double getLowerBound() { return lowerBound; }
    public double getUpperBound() { return upperBound; }
    public double getConfidence() { return confidence; }
}