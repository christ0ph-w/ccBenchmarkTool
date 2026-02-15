package com.benchmarktool.api.model;

/**
 * Request to start a benchmark.
 * Supports both Petri net (.pnml) and Process Tree (.ptml) models.
 */
public class BenchmarkRequest {
    private String pnmlModelPath;    // Path to .pnml file (for ILP, SPLITPOINT)
    private String ptmlModelPath;    // Path to .ptml file (for PTALIGN)
    private String logDirectory;     // Directory containing .xes files
    private String algorithm;        // "ILP", "SPLITPOINT", or "PTALIGN"
    private Integer numThreads;

    // ========================================
    // PTALIGN Configuration Options
    // ========================================
    
    private Boolean useBounds = true;
    private Boolean useWarmStart = true;
    private Double boundThreshold = 1.0;
    private String boundedSkipStrategy = "upper";  // "lower", "midpoint", "upper"
    private Boolean propagateCostsAcrossClusters = false;
    
    public BenchmarkRequest() {}
    
    public BenchmarkRequest(String pnmlModelPath, String ptmlModelPath, String logDirectory, String algorithm) {
        this.pnmlModelPath = pnmlModelPath;
        this.ptmlModelPath = ptmlModelPath;
        this.logDirectory = logDirectory;
        this.algorithm = algorithm;
    }
    
    // Petri net model path
    public String getPnmlModelPath() { return pnmlModelPath; }
    public void setPnmlModelPath(String pnmlModelPath) { this.pnmlModelPath = pnmlModelPath; }
    
    // Process tree model path
    public String getPtmlModelPath() { return ptmlModelPath; }
    public void setPtmlModelPath(String ptmlModelPath) { this.ptmlModelPath = ptmlModelPath; }
    
    // Log directory
    public String getLogDirectory() { return logDirectory; }
    public void setLogDirectory(String logDirectory) { this.logDirectory = logDirectory; }
    
    // Algorithm
    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }
    
    // Thread count
    public Integer getNumThreads() { return numThreads; }
    public void setNumThreads(Integer numThreads) { this.numThreads = numThreads; }
    
    /**
     * Get the appropriate model path based on algorithm's model type
     */
    public String getModelPathForType(String modelType) {
        if ("ptml".equals(modelType)) {
            return ptmlModelPath;
        }
        return pnmlModelPath;
    }

    // PTALIGN config getters with defaults
    
    public Boolean getUseBounds() { 
        return useBounds != null ?  useBounds : true; 
    }
    public void setUseBounds(Boolean useBounds) { 
        this.useBounds = useBounds; 
    }

    public Boolean getUseWarmStart() { 
        return useWarmStart != null ? useWarmStart : true; 
    }
    public void setUseWarmStart(Boolean useWarmStart) { 
        this.useWarmStart = useWarmStart; 
    }

    public Double getBoundThreshold() { 
        return boundThreshold != null ? boundThreshold : 1.0; 
    }
    public void setBoundThreshold(Double boundThreshold) { 
        this.boundThreshold = boundThreshold; 
    }

    public String getBoundedSkipStrategy() { 
        return boundedSkipStrategy != null ? boundedSkipStrategy : "upper"; 
    }
    public void setBoundedSkipStrategy(String boundedSkipStrategy) { 
        this.boundedSkipStrategy = boundedSkipStrategy; 
    }

    public Boolean getPropagateCostsAcrossClusters() { 
        return propagateCostsAcrossClusters != null ? propagateCostsAcrossClusters : false; 
    }
    public void setPropagateCostsAcrossClusters(Boolean propagateCostsAcrossClusters) { 
        this.propagateCostsAcrossClusters = propagateCostsAcrossClusters; 
    }
}