package com.benchmarktool.api.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

/**
 * Complete benchmark result
 */
public class BenchmarkResult {
    private String benchmarkId;
    private String modelFile;
    private String algorithm;
    private int numThreads;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private long totalExecutionTimeMs;
    private long peakMemoryMb;
    private boolean success;
    private String errorMessage;
    private List<LogBenchmarkResult> logResults;
    private Map<String, Object> ptalignConfig;
    
    public BenchmarkResult() {
        this.logResults = new ArrayList<>();
        this.startTime = LocalDateTime.now();
        this.numThreads = 1;
    }
    
    // Getters and setters
    public String getBenchmarkId() { return benchmarkId; }
    public void setBenchmarkId(String benchmarkId) { this.benchmarkId = benchmarkId; }
    
    public String getModelFile() { return modelFile; }
    public void setModelFile(String modelFile) { this.modelFile = modelFile; }
    
    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public int getNumThreads() { return numThreads; }
    public void setNumThreads(int numThreads) { this.numThreads = numThreads; }
    
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
    
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    
    public long getTotalExecutionTimeMs() { return totalExecutionTimeMs; }
    public void setTotalExecutionTimeMs(long totalExecutionTimeMs) { this.totalExecutionTimeMs = totalExecutionTimeMs; }
    
    public long getPeakMemoryMb() { return peakMemoryMb; }
    public void setPeakMemoryMb(long peakMemoryMb) { this.peakMemoryMb = peakMemoryMb; }
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    
    public List<LogBenchmarkResult> getLogResults() { return logResults; }
    public void setLogResults(List<LogBenchmarkResult> logResults) { this.logResults = logResults;}

    public Map<String, Object> getPtalignConfig() { return ptalignConfig; }
    public void setPtalignConfig(Map<String, Object> ptalignConfig) { this.ptalignConfig = ptalignConfig;}
}