package com.benchmarktool.api.util.strategy;

import java.util.ArrayList;
import java.util.List;

/**
 * Unified result type for all alignment algorithms.
 * Each strategy converts its native result format into this.
 */
public class AlignmentResult {
    private final double avgFitness;
    private final double avgCost;
    private final int totalTraces;
    private final int totalVariants;
    private final int successfulAlignments;
    private final int failedAlignments;
    private final Double shortestPathCost;
    private final long executionTimeMs;
    private final TimingBreakdown timing;
    private final OptimizationStats optimizationStats;
    private final List<TraceAlignmentDetail> alignments;
    private final List<BoundsProgressionEntry> boundsProgression;
    private final List<GlobalBoundsSnapshot> globalBoundsProgression;

    private AlignmentResult(Builder builder) {
        this.avgFitness = builder.avgFitness;
        this.avgCost = builder.avgCost;
        this.totalTraces = builder.totalTraces;
        this.totalVariants = builder.totalVariants;
        this.successfulAlignments = builder.successfulAlignments;
        this.failedAlignments = builder.failedAlignments;
        this.shortestPathCost = builder.shortestPathCost;
        this.executionTimeMs = builder.executionTimeMs;
        this.timing = builder.timing;
        this.optimizationStats = builder.optimizationStats;
        this.alignments = builder.alignments;
        this.boundsProgression = builder.boundsProgression;
        this.globalBoundsProgression = builder.globalBoundsProgression;
    }

    // Getters
    public double getAvgFitness() { return avgFitness; }
    public double getAvgCost() { return avgCost; }
    public int getTotalTraces() { return totalTraces; }
    public int getTotalVariants() { return totalVariants; }
    public int getSuccessfulAlignments() { return successfulAlignments; }
    public int getFailedAlignments() { return failedAlignments; }
    public Double getShortestPathCost() { return shortestPathCost; }
    public long getExecutionTimeMs() { return executionTimeMs; }
    public TimingBreakdown getTiming() { return timing; }
    public OptimizationStats getOptimizationStats() { return optimizationStats; }
    public List<TraceAlignmentDetail> getAlignments() { return alignments; }
    public List<BoundsProgressionEntry> getBoundsProgression() { return boundsProgression; }
    public List<GlobalBoundsSnapshot> getGlobalBoundsProgression() { return globalBoundsProgression; }

    public static Builder builder() {
        return new Builder();
    }

    /**
     * Statistics about optimization techniques used
     */
    public static class OptimizationStats {
        public final int fullAlignments;
        public final int warmStartAlignments;
        public final int boundedSkips;
        public final int cachedAlignments;

        public OptimizationStats(int fullAlignments, int warmStartAlignments, 
                                 int boundedSkips, int cachedAlignments) {
            this.fullAlignments = fullAlignments;
            this.warmStartAlignments = warmStartAlignments;
            this.boundedSkips = boundedSkips;
            this.cachedAlignments = cachedAlignments;
        }

        // Backward compatible constructor
        public OptimizationStats(int fullAlignments, int warmStartAlignments, int boundedSkips) {
            this(fullAlignments, warmStartAlignments, boundedSkips, 0);
        }

        public int getTotal() {
            return fullAlignments + warmStartAlignments + boundedSkips + cachedAlignments;
        }
        
        public double getOptimizationRate() {
            int total = getTotal();
            if (total == 0) return 0;
            return (double)(warmStartAlignments + boundedSkips + cachedAlignments) / total;
        }

        // Getters for JSON serialization
        public int getFullAlignments() { return fullAlignments; }
        public int getWarmStartAlignments() { return warmStartAlignments; }
        public int getBoundedSkips() { return boundedSkips; }
        public int getCachedAlignments() { return cachedAlignments; } 
    }

    /**
     * Tracks bounds tightening over the alignment process.
     * Used for analyzing how bounds improve as more reference alignments become available.
     */
    public static class BoundsProgressionEntry {
        private final int variantIndex;
        private final int numReferences;
        private final double lowerBound;
        private final Double upperBound;
        private final Double gap;
        private final Double estimatedCost;  // For bounded_skip (no actual alignment)
        private final Double actualCost;     // For full/warm_start (actual alignment computed)
        private final String method;

        public BoundsProgressionEntry(int variantIndex, int numReferences, double lowerBound,
                                      Double upperBound, Double gap, Double estimatedCost,
                                      Double actualCost, String method) {
            this.variantIndex = variantIndex;
            this.numReferences = numReferences;
            this.lowerBound = lowerBound;
            this.upperBound = upperBound;
            this.gap = gap;
            this.estimatedCost = estimatedCost;
            this.actualCost = actualCost;
            this.method = method;
        }

        // Getters
        public int getVariantIndex() { return variantIndex; }
        public int getNumReferences() { return numReferences; }
        public double getLowerBound() { return lowerBound; }
        public Double getUpperBound() { return upperBound; }
        public Double getGap() { return gap; }
        public Double getEstimatedCost() { return estimatedCost; }
        public Double getActualCost() { return actualCost; }
        public String getMethod() { return method; }
    }

    /**
     * Snapshot of bounds for all remaining traces at a point in time.
     * Used for generating convergence visualization data.
     */
    public static class GlobalBoundsSnapshot {
        private final int numReferences;
        private final int numRemaining;
        private final double meanLowerBound;
        private final double meanUpperBound;
        private final double meanGap;
        private final double minGap;
        private final double maxGap;
        private final int numSkippable;

        public GlobalBoundsSnapshot(int numReferences, int numRemaining,
                                    double meanLowerBound, double meanUpperBound,
                                    double meanGap, double minGap, double maxGap,
                                    int numSkippable) {
            this.numReferences = numReferences;
            this.numRemaining = numRemaining;
            this.meanLowerBound = meanLowerBound;
            this.meanUpperBound = meanUpperBound;
            this.meanGap = meanGap;
            this.minGap = minGap;
            this.maxGap = maxGap;
            this.numSkippable = numSkippable;
        }

        // Getters
        public int getNumReferences() { return numReferences; }
        public int getNumRemaining() { return numRemaining; }
        public double getMeanLowerBound() { return meanLowerBound; }
        public double getMeanUpperBound() { return meanUpperBound; }
        public double getMeanGap() { return meanGap; }
        public double getMinGap() { return minGap; }
        public double getMaxGap() { return maxGap; }
        public int getNumSkippable() { return numSkippable; }
    }

    public static class Builder {
        private double avgFitness;
        private double avgCost;
        private int totalTraces;
        private int totalVariants;
        private int successfulAlignments;
        private int failedAlignments;
        private Double shortestPathCost;
        private long executionTimeMs;
        private TimingBreakdown timing;
        private OptimizationStats optimizationStats;
        private List<TraceAlignmentDetail> alignments = new ArrayList<>();
        private List<BoundsProgressionEntry> boundsProgression = new ArrayList<>();
        private List<GlobalBoundsSnapshot> globalBoundsProgression = new ArrayList<>();

        public Builder avgFitness(double avgFitness) {
            this.avgFitness = avgFitness;
            return this;
        }

        public Builder avgCost(double avgCost) {
            this.avgCost = avgCost;
            return this;
        }

        public Builder totalTraces(int totalTraces) {
            this.totalTraces = totalTraces;
            return this;
        }

        public Builder totalVariants(int totalVariants) {
            this.totalVariants = totalVariants;
            return this;
        }

        public Builder successfulAlignments(int successfulAlignments) {
            this.successfulAlignments = successfulAlignments;
            return this;
        }

        public Builder failedAlignments(int failedAlignments) {
            this.failedAlignments = failedAlignments;
            return this;
        }
        
        public Builder shortestPathCost(Double shortestPathCost) {
            this.shortestPathCost = shortestPathCost;
            return this;
        }

        public Builder executionTimeMs(long executionTimeMs) {
            this.executionTimeMs = executionTimeMs;
            return this;
        }

        public Builder timing(TimingBreakdown timing) {
            this.timing = timing;
            return this;
        }

        public Builder optimizationStats(OptimizationStats stats) {
            this.optimizationStats = stats;
            return this;
        }

        public Builder alignments(List<TraceAlignmentDetail> alignments) {
            this.alignments = alignments;
            return this;
        }

        public Builder addAlignment(TraceAlignmentDetail alignment) {
            this.alignments.add(alignment);
            return this;
        }

        public Builder boundsProgression(List<BoundsProgressionEntry> boundsProgression) {
            this.boundsProgression = boundsProgression;
            return this;
        }

        public AlignmentResult build() {
            return new AlignmentResult(this);
        }

        public Builder globalBoundsProgression(List<GlobalBoundsSnapshot> globalBoundsProgression) {
            this.globalBoundsProgression = globalBoundsProgression;
            return this;
        }
    }
}