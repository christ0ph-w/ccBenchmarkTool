package com.benchmarktool.api.util.strategy;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AlignmentStrategyRegistry {
    private static final Logger logger = LogManager.getLogger(AlignmentStrategyRegistry.class);
    private final Map<String, AlignmentStrategy> strategies = new ConcurrentHashMap<>();
    
    public static class AlgorithmInfo {
        public String name;
        public String description;
        public String modelType;
        
        public AlgorithmInfo(String name, String description, String modelType) {
            this.name = name;
            this.description = description;
            this.modelType = modelType;
        }
    }
    
    public AlignmentStrategyRegistry(
            ILPAlignmentStrategy ilpStrategy,
            SplitPointAlignmentStrategy splitPointStrategy,
            ProcessTreeAlignmentStrategy processTreeStrategy) {
        
        register(ilpStrategy);
        register(splitPointStrategy);
        register(processTreeStrategy);
        
        logger.info("Registered {} alignment strategies:  {}", strategies.size(), strategies.keySet());
    }
    
    public void register(AlignmentStrategy strategy) {
        strategies.put(strategy.getName(), strategy);
        logger.info("Registered strategy: {} ({}) - requires {}", 
            strategy.getName(), 
            strategy.getDescription(),
            strategy.getModelType());
    }
    
    public AlignmentStrategy getStrategy(String name) {
        AlignmentStrategy strategy = strategies.get(name);
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown strategy: " + name + " Available: " + strategies.keySet());
        }
        return strategy;
    }
    
    public Set<String> getAvailableStrategies() {
        return new HashSet<>(strategies.keySet());
    }
    
    public List<AlgorithmInfo> getAvailableAlgorithms() {
        List<AlgorithmInfo> algorithms = new ArrayList<>();
        for (AlignmentStrategy strategy :  strategies.values()) {
            algorithms.add(new AlgorithmInfo(
                strategy.getName(),
                strategy.getDescription(),
                strategy.getModelType().getFileExtension()
            ));
        }
        return algorithms;
    }
}