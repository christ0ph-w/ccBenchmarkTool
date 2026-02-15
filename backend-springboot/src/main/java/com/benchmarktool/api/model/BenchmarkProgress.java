package com.benchmarktool.api.model;

public class BenchmarkProgress {
    private String benchmarkId;
    private String algorithm;
    // File tracking
    private int totalFiles;
    private int currentFile;
    // Trace tracking
    private int totalTracesInCurrentFile;
    private int currentTraceInFile;
    private String currentFileName;
    private long currentFileStartTime;

    private double percentComplete;
    private String status; // RUNNING, COMPLETED, FAILED
    private String error;
    
    // Getters and Setters
    public String getBenchmarkId() { return benchmarkId; }
    public void setBenchmarkId(String benchmarkId) { this.benchmarkId = benchmarkId; }
    
    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }
    
    public int getTotalFiles() { return totalFiles; }
    public void setTotalFiles(int totalFiles) { this.totalFiles = totalFiles; }
    
    public int getCurrentFile() { return currentFile; }
    public void setCurrentFile(int currentFile) { this.currentFile = currentFile; }
    public int getTotalTracesInCurrentFile() { return totalTracesInCurrentFile; }
    public void setTotalTracesInCurrentFile(int totalTracesInCurrentFile) { 
        this.totalTracesInCurrentFile = totalTracesInCurrentFile; 
    }

    public int getCurrentTraceInFile() { return currentTraceInFile; }
    public void setCurrentTraceInFile(int currentTraceInFile) { 
        this.currentTraceInFile = currentTraceInFile; 
    }

    public String getCurrentFileName() { return currentFileName; }
    public void setCurrentFileName(String currentFileName) { 
        this.currentFileName = currentFileName; 
    }

    public long getCurrentFileStartTime() { return currentFileStartTime; }
    public void setCurrentFileStartTime(long currentFileStartTime) { 
        this.currentFileStartTime = currentFileStartTime; 
    }

    public double getPercentComplete() { return percentComplete; }
    public void setPercentComplete(double percentComplete) { this.percentComplete = percentComplete; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
