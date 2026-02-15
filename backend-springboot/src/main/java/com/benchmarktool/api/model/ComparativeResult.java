package com.benchmarktool.api.model;

import java.time.LocalDateTime;
import java.util.Map;

public class ComparativeResult {
    private String comparativeId;
    private String modelFile;
    private int totalFilesProcessed;
    private int totalTraces;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Map<String, AlgorithmComparison> algorithmResults;
    private boolean success;
    private String errorMessage;
    
    public ComparativeResult() {}
    
    // Getters and Setters
    public String getComparativeId() { return comparativeId; }
    public void setComparativeId(String comparativeId) { this.comparativeId = comparativeId; }
    
    public String getModelFile() { return modelFile; }
    public void setModelFile(String modelFile) { this.modelFile = modelFile; }
    
    public int getTotalFilesProcessed() { return totalFilesProcessed; }
    public void setTotalFilesProcessed(int totalFilesProcessed) { this.totalFilesProcessed = totalFilesProcessed; }
    
    public int getTotalTraces() { return totalTraces; }
    public void setTotalTraces(int totalTraces) { this.totalTraces = totalTraces; }
    
    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this. startTime = startTime; }
    
    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this. endTime = endTime; }
    
    public Map<String, AlgorithmComparison> getAlgorithmResults() { return algorithmResults; }
    public void setAlgorithmResults(Map<String, AlgorithmComparison> algorithmResults) { this. algorithmResults = algorithmResults; }
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this. errorMessage = errorMessage; }
    
    // Inner class for algorithm comparison
    public static class AlgorithmComparison {
        public String algorithmName;
        public long totalExecutionTimeMs;
        public double averageFitness;
        public double averageCost;
        public long peakMemoryMb;
        public int successfulAlignments;
        public int failedAlignments;
        
        public AlgorithmComparison(String algorithmName) {
            this.algorithmName = algorithmName;
        }
    }
}
