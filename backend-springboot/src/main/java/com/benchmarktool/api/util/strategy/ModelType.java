package com.benchmarktool.api.util.strategy;

/**
 * Defines the type of process model required by an alignment algorithm
 */
public enum ModelType {
    PETRI_NET("pnml"),      // .pnml files - used by ILP, SplitPoint
    PROCESS_TREE("ptml");   // .ptml files - used by ProcessTree alignment
    
    private final String fileExtension;
    
    ModelType(String fileExtension) {
        this.fileExtension = fileExtension;
    }
    
    public String getFileExtension() {
        return fileExtension;
    }
}
