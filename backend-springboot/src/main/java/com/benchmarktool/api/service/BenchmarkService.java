package com.benchmarktool.api.service;

import org.springframework.stereotype.Service;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.benchmarktool.api.model.BenchmarkRequest;
import com.benchmarktool.api.model.BenchmarkResult;

import java.util.UUID;

/**
 * Orchestration layer for benchmarks.
 * Delegates execution to BenchmarkExecutor.
 */
@Service
public class BenchmarkService {
    private static final Logger logger = LogManager.getLogger(BenchmarkService.class);
    
    private final BenchmarkExecutor benchmarkExecutor;
    
    public BenchmarkService(BenchmarkExecutor benchmarkExecutor) {
        this.benchmarkExecutor = benchmarkExecutor;
    }
    
    /**
     * Run a benchmark with the specified algorithm
     */
    public BenchmarkResult runBenchmark(BenchmarkRequest request, String benchmarkId) {
        if (benchmarkId == null) {
            benchmarkId = UUID.randomUUID().toString();
        }
        
        logger.info("Starting benchmark: {} with algorithm: {}", benchmarkId, request.getAlgorithm());
        
        return benchmarkExecutor.executeBenchmark(request, benchmarkId);
    }
}