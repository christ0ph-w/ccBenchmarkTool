package com.benchmarktool.api.util.strategy;

import com.benchmarktool.api.util.strategy.ptalign.AlignmentClient;
import com.benchmarktool.api.util.strategy.ptalign.PythonServerManager;
import com.benchmarktool.api.util.strategy.ptalign.ResponseParser;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Alignment strategy using Python-based Gurobi solver.
 * Delegates server management, HTTP communication, and parsing to specialized classes.
 */
@Component
public class ProcessTreeAlignmentStrategy implements AlignmentStrategy {
    private static final Logger logger = LogManager.getLogger(ProcessTreeAlignmentStrategy.class);
    
    private final PythonServerManager serverManager;
    private final AlignmentClient client;
    private final ResponseParser parser;
    
    private String currentModelPath = null;
    
    // Configuration
    private boolean useBounds = true;
    private boolean useWarmStart = true;
    private double boundThreshold = 1.0;
    private String boundedSkipStrategy = "upper";
    private boolean propagateCosts = false;
    
    // Cross-cluster cost propagation
    private final Map<String, Double> accumulatedCosts = new ConcurrentHashMap<>();

    public ProcessTreeAlignmentStrategy() {
        this.serverManager = new PythonServerManager();
        this.client = new AlignmentClient();
        this.parser = new ResponseParser();
        logger.info("ProcessTreeAlignmentStrategy initialized");
    }

    // Configuration setters
    public void setUseBounds(boolean useBounds) { this.useBounds = useBounds; }
    public void setUseWarmStart(boolean useWarmStart) { this.useWarmStart = useWarmStart; }
    public void setBoundThreshold(double boundThreshold) { this.boundThreshold = boundThreshold; }
    public void setBoundedSkipStrategy(String strategy) { this.boundedSkipStrategy = strategy; }
    public void setPropagateCosts(boolean propagateCosts) { this.propagateCosts = propagateCosts; }
    
    public void resetAccumulatedCosts() {
        this.accumulatedCosts.clear();
    }

    @Override
    public ModelType getModelType() {
        return ModelType.PROCESS_TREE;
    }

    @Override
    public AlignmentResult computeAlignment(AlignmentInput input) throws Exception {
        throw new UnsupportedOperationException("Use computeAlignmentFromFile()");
    }

    public synchronized void ensureServersRunning(int numServers, String modelPath) throws Exception {
        boolean serversChanged = serverManager.ensureServersRunning(numServers);
        
        // If servers were restarted OR model path changed, reload the model
        if (serversChanged || !modelPath.equals(currentModelPath)) {
            loadModelOnAllServers(modelPath);
            currentModelPath = modelPath;
        }
    }

    public synchronized void restartServers() throws Exception {
        String modelPath = currentModelPath;
        serverManager.restartServers();
        
        if (modelPath != null) {
            loadModelOnAllServers(modelPath);
            currentModelPath = modelPath;
        }
    }

    public AlignmentResult computeAlignmentFromFile(
            String logFilePath, 
            String modelPath, 
            String distanceMatrixPath) throws Exception {
        
        long startTime = System.currentTimeMillis();
        String serverUrl = serverManager.getNextServerUrl();
        
        logger.info("Alignment request -> {} for file: {}", serverUrl, logFilePath);
        
        AlignmentClient.AlignmentRequest request = new AlignmentClient.AlignmentRequest(
            logFilePath,
            useBounds,
            useWarmStart,
            boundThreshold,
            boundedSkipStrategy,
            distanceMatrixPath,
            propagateCosts ? new ConcurrentHashMap<>(accumulatedCosts) : null
        );
        
        String jsonResponse = client.align(serverUrl, request);
        long executionTime = System.currentTimeMillis() - startTime;
        
        // Accumulate costs for cross-cluster optimization
        if (propagateCosts) {
            accumulatedCosts.putAll(parser.extractVariantCosts(jsonResponse));
        }
        
        return parser.parse(jsonResponse, executionTime);
    }

    public AlignmentResult computeAlignmentFromFile(String logFilePath, String modelPath) throws Exception {
        return computeAlignmentFromFile(logFilePath, modelPath, null);
    }

    private void loadModelOnAllServers(String modelPath) throws Exception {
        logger.info("Loading model on all servers: {}", modelPath);
        
        // Load on each server (simplified - could be parallel)
        for (int i = 0; i < serverManager.getServerCount(); i++) {
            String url = serverManager.getNextServerUrl();
            client.loadModel(url, modelPath);
        }
        
        logger.info("Model loaded on all servers");
    }

    @PreDestroy
    public void cleanup() {
        logger.info("Shutting down - stopping all alignment servers");
        serverManager.stopAllServers();
    }

    @Override
    public String getName() {
        return "PTALIGN";
    }

    @Override
    public String getDescription() {
        return "Process Tree Alignment - Gurobi-based with warm start and bounds optimization";
    }
}