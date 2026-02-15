package com.benchmarktool.api.util.strategy;

/**
 * Strategy interface for alignment algorithms.
 * Each implementation handles its own model type and result conversion.
 */
public interface AlignmentStrategy {
    
    /**
     * The type of model this strategy requires
     */
    ModelType getModelType();
    
    /**
     * Compute alignment and return unified result.
     * Strategy is responsible for converting native results (PNRepResult, JSON, etc.)
     * into the common AlignmentResult format.
     */
    AlignmentResult computeAlignment(AlignmentInput input) throws Exception;
    
    /**
     * Algorithm identifier
     */
    String getName();
    
    /**
     * Description
     */
    String getDescription();
}
