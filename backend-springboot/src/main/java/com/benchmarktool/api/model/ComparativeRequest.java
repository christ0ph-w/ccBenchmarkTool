package com.benchmarktool.api.model;

import java.util.List;

/**
 * Request for comparative benchmark across multiple algorithms
 */
public class ComparativeRequest {
    private String pnmlModelPath;    // Path to .pnml file
    private String ptmlModelPath;    // Path to .ptml file
    private String logDirectory;     // Directory containing .xes files
    private List<String> algorithms; // List of algorithms to compare
    private Integer numThreads;
    
    public ComparativeRequest() {}
    
    // Petri net model path
    public String getPnmlModelPath() { return pnmlModelPath; }
    public void setPnmlModelPath(String pnmlModelPath) { this.pnmlModelPath = pnmlModelPath; }
    
    // Process tree model path
    public String getPtmlModelPath() { return ptmlModelPath; }
    public void setPtmlModelPath(String ptmlModelPath) { this.ptmlModelPath = ptmlModelPath; }
    
    // Log directory
    public String getLogDirectory() { return logDirectory; }
    public void setLogDirectory(String logDirectory) { this.logDirectory = logDirectory; }
    
    // Algorithms
    public List<String> getAlgorithms() { return algorithms; }
    public void setAlgorithms(List<String> algorithms) { this.algorithms = algorithms; }
    
    // Thread count
    public Integer getNumThreads() { return numThreads; }
    public void setNumThreads(Integer numThreads) { this.numThreads = numThreads; }
}
