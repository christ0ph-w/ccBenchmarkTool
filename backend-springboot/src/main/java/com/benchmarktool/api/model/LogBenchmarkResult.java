package com.benchmarktool.api.model;

import com.benchmarktool.api.util.strategy.AlignmentResult;
import com.benchmarktool.api.util.strategy.TimingBreakdown;
import com.benchmarktool.api.util.strategy.TraceAlignmentDetail;

import java.util.ArrayList;
import java.util.List;

/**
 * Result for a single XES log file (or cluster file)
 */
public class LogBenchmarkResult {
    private String logName;
    private int totalTraces;
    private int totalVariants;
    private int successfulAlignments;
    private int failedAlignments;
    private double avgFitness;
    private double avgCost;
    private Double shortestPathCost;
    private long executionTimeMs;
    private long memoryUsedMb;
    private TimingBreakdown timing;
    private AlignmentResult.OptimizationStats optimizationStats;
    private List<TraceAlignmentDetail> alignments;
    private List<AlignmentResult.BoundsProgressionEntry> boundsProgression;
    private List<AlignmentResult.GlobalBoundsSnapshot> globalBoundsProgression;

    public LogBenchmarkResult() {
        this.alignments = new ArrayList<>();
        this.boundsProgression = new ArrayList<>();
    }

    public LogBenchmarkResult(String logName, int totalTraces, int totalVariants,
                              int successfulAlignments, int failedAlignments,
                              double avgFitness, double avgCost,
                              long executionTimeMs, long memoryUsedMb,
                              List<TraceAlignmentDetail> alignments) {
        this.logName = logName;
        this.totalTraces = totalTraces;
        this.totalVariants = totalVariants;
        this.successfulAlignments = successfulAlignments;
        this.failedAlignments = failedAlignments;
        this.avgFitness = avgFitness;
        this.avgCost = avgCost;
        this.executionTimeMs = executionTimeMs;
        this.memoryUsedMb = memoryUsedMb;
        this.alignments = alignments != null ? alignments : new ArrayList<>();
        this.boundsProgression = new ArrayList<>();
    }

    // Constructor with timing breakdown and optimization stats
    public LogBenchmarkResult(String logName, int totalTraces, int totalVariants,
                              int successfulAlignments, int failedAlignments,
                              double avgFitness, double avgCost,
                              long executionTimeMs, long memoryUsedMb,
                              TimingBreakdown timing,
                              AlignmentResult.OptimizationStats optimizationStats,
                              List<TraceAlignmentDetail> alignments) {
        this(logName, totalTraces, totalVariants, successfulAlignments, failedAlignments,
             avgFitness, avgCost, executionTimeMs, memoryUsedMb, alignments);
        this.timing = timing;
        this.optimizationStats = optimizationStats;
    }

    // Full constructor with bounds progression
    public LogBenchmarkResult(String logName, int totalTraces, int totalVariants,
                              int successfulAlignments, int failedAlignments,
                              double avgFitness, double avgCost,
                              long executionTimeMs, long memoryUsedMb,
                              TimingBreakdown timing,
                              AlignmentResult.OptimizationStats optimizationStats,
                              List<TraceAlignmentDetail> alignments,
                              List<AlignmentResult.BoundsProgressionEntry> boundsProgression) {
        this(logName, totalTraces, totalVariants, successfulAlignments, failedAlignments,
             avgFitness, avgCost, executionTimeMs, memoryUsedMb, timing, optimizationStats, alignments);
        this.boundsProgression = boundsProgression != null ? boundsProgression : new ArrayList<>();
    }

    // Full constructor with global bounds progression
    public LogBenchmarkResult(String logName, int totalTraces, int totalVariants,
                            int successfulAlignments, int failedAlignments,
                            double avgFitness, double avgCost,
                            long executionTimeMs, long memoryUsedMb,
                            TimingBreakdown timing,
                            AlignmentResult.OptimizationStats optimizationStats,
                            List<TraceAlignmentDetail> alignments,
                            List<AlignmentResult.BoundsProgressionEntry> boundsProgression,
                            List<AlignmentResult.GlobalBoundsSnapshot> globalBoundsProgression) {
        this(logName, totalTraces, totalVariants, successfulAlignments, failedAlignments,
            avgFitness, avgCost, executionTimeMs, memoryUsedMb, timing, optimizationStats, alignments, boundsProgression);
        this.globalBoundsProgression = globalBoundsProgression != null ? globalBoundsProgression : new ArrayList<>();
    }

    // Getters and setters
    public String getLogName() { return logName; }
    public void setLogName(String logName) { this.logName = logName; }

    public int getTotalTraces() { return totalTraces; }
    public void setTotalTraces(int totalTraces) { this.totalTraces = totalTraces; }

    public int getTotalVariants() { return totalVariants; }
    public void setTotalVariants(int totalVariants) { this.totalVariants = totalVariants; }

    public int getSuccessfulAlignments() { return successfulAlignments; }
    public void setSuccessfulAlignments(int successfulAlignments) { this.successfulAlignments = successfulAlignments; }

    public int getFailedAlignments() { return failedAlignments; }
    public void setFailedAlignments(int failedAlignments) { this.failedAlignments = failedAlignments; }

    public double getAvgFitness() { return avgFitness; }
    public void setAvgFitness(double avgFitness) { this.avgFitness = avgFitness; }

    public double getAvgCost() { return avgCost; }
    public void setAvgCost(double avgCost) { this.avgCost = avgCost; }

    public Double getShortestPathCost() { return shortestPathCost; }
    public void setShortestPathCost(Double shortestPathCost) { this.shortestPathCost = shortestPathCost; }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public long getMemoryUsedMb() { return memoryUsedMb; }
    public void setMemoryUsedMb(long memoryUsedMb) { this.memoryUsedMb = memoryUsedMb; }

    public TimingBreakdown getTiming() { return timing; }
    public void setTiming(TimingBreakdown timing) { this.timing = timing; }

    public AlignmentResult.OptimizationStats getOptimizationStats() { return optimizationStats; }
    public void setOptimizationStats(AlignmentResult.OptimizationStats stats) { this.optimizationStats = stats; }

    public List<TraceAlignmentDetail> getAlignments() { return alignments; }
    public void setAlignments(List<TraceAlignmentDetail> alignments) { this.alignments = alignments; }

    public List<AlignmentResult.BoundsProgressionEntry> getBoundsProgression() { return boundsProgression; }
    public void setBoundsProgression(List<AlignmentResult.BoundsProgressionEntry> boundsProgression) { 
        this.boundsProgression = boundsProgression; 
    }
    public List<AlignmentResult.GlobalBoundsSnapshot> getGlobalBoundsProgression() { 
        return globalBoundsProgression; 
    }
    public void setGlobalBoundsProgression(List<AlignmentResult.GlobalBoundsSnapshot> globalBoundsProgression) { 
        this.globalBoundsProgression = globalBoundsProgression; 
    }
}
