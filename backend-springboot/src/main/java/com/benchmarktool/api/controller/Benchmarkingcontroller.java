package com.benchmarktool.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.benchmarktool.api.model.*;
import com.benchmarktool.api.service.*;
import com.benchmarktool.api.util.strategy.AlignmentStrategyRegistry;
import com.benchmarktool.api.util.strategy.ProcessTreeAlignmentStrategy;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * REST Controller for benchmark operations.
 * 
 * Endpoints:
 * - POST /benchmark/run          - Start async benchmark
 * - GET  /benchmark/run/{id}     - Get cached results
 * - POST /benchmark/run-sync     - Run benchmark synchronously
 * - POST /benchmark/compare      - Start async comparative benchmark
 * - GET  /benchmark/compare/{id} - Get cached comparative results
 * - GET  /benchmark/algorithms   - List available algorithms
 * - POST /benchmark/restart-ptalign-servers - Restart Python servers
 */
@RestController
@RequestMapping("/benchmark")
public class Benchmarkingcontroller {
    private static final Logger logger = LogManager.getLogger(Benchmarkingcontroller.class);

    private final ProcessTreeAlignmentStrategy processTreeAlignmentStrategy;
    private final BenchmarkExecutor benchmarkExecutor;
    private final AlignmentStrategyRegistry strategyRegistry;
    private final ResultCache resultCache;
    private final ExecutorService asyncExecutor = Executors.newFixedThreadPool(10);

    // Constructor injection (preferred over @Autowired on fields)
    public Benchmarkingcontroller(
            ProcessTreeAlignmentStrategy processTreeAlignmentStrategy,
            BenchmarkExecutor benchmarkExecutor,
            AlignmentStrategyRegistry strategyRegistry,
            ResultCache resultCache) {
        this.processTreeAlignmentStrategy = processTreeAlignmentStrategy;
        this.benchmarkExecutor = benchmarkExecutor;
        this.strategyRegistry = strategyRegistry;
        this.resultCache = resultCache;
    }

    /**
     * Get list of available algorithms.
     */
    @GetMapping("/algorithms")
    public ResponseEntity<List<AlignmentStrategyRegistry.AlgorithmInfo>> getAvailableAlgorithms() {
        return ResponseEntity.ok(strategyRegistry.getAvailableAlgorithms());
    }

    /**
     * Start a benchmark asynchronously.
     * Returns immediately with benchmarkId for polling.
     */
    @PostMapping("/run")
    public ResponseEntity<BenchmarkRunResponse> startBenchmark(@RequestBody BenchmarkRequest request) {
        logger.info("Starting async benchmark with algorithm: {}", request.getAlgorithm());

        String benchmarkId = java.util.UUID.randomUUID().toString();

        BenchmarkRunResponse response = new BenchmarkRunResponse();
        response.setBenchmarkId(benchmarkId);
        response.setStatusUrl("/api/benchmark/run/" + benchmarkId);

        asyncExecutor.submit(() -> {
            try {
                logger.info("Background thread executing benchmark: {}", benchmarkId);
                BenchmarkResult result = benchmarkExecutor.executeBenchmark(request, benchmarkId);
                resultCache.cache(benchmarkId, result);
                logger.info("Benchmark {} completed and cached", benchmarkId);
            } catch (Exception e) {
                logger.error("Error executing benchmark {}: {}", benchmarkId, e.getMessage(), e);
            }
        });

        return ResponseEntity.ok(response);
    }

    /**
     * Get cached benchmark results.
     */
    @GetMapping("/run/{benchmarkId}")
    public ResponseEntity<?> getBenchmarkResult(@PathVariable String benchmarkId) {
        BenchmarkResult result = resultCache.retrieve(benchmarkId, BenchmarkResult.class);

        if (result == null) {
            return ResponseEntity.status(404).body(
                Map.of("error", "Benchmark results not found or expired", "benchmarkId", benchmarkId)
            );
        }

        logger.info("Found benchmark result: {}", benchmarkId);
        return ResponseEntity.ok(result);
    }

    /**
     * Run benchmark synchronously - blocks until complete.
     * Use for scripted batch runs.
     */
    @PostMapping("/run-sync")
    public ResponseEntity<?> runBenchmarkSync(@RequestBody BenchmarkRequest request) {
        logger.info("Starting SYNC benchmark with algorithm: {}", request.getAlgorithm());
        
        String benchmarkId = java.util.UUID.randomUUID().toString();
        
        try {
            BenchmarkResult result = benchmarkExecutor.executeBenchmark(request, benchmarkId);
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "benchmarkId", benchmarkId,
                "algorithm", result.getAlgorithm(),
                "totalExecutionTimeMs", result.getTotalExecutionTimeMs(),
                "success", result.isSuccess(),
                "logsProcessed", result.getLogResults().size()
            ));
        } catch (Exception e) {
            logger.error("Sync benchmark failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get cached comparative benchmark results.
     */
    @GetMapping("/compare/{comparativeId}")
    public ResponseEntity<?> getComparativeResult(@PathVariable String comparativeId) {
        logger.info("Fetching comparative results: {}", comparativeId);

        ComparativeResult result = resultCache.retrieve(comparativeId, ComparativeResult.class);

        if (result == null) {
            logger.error("Comparative result not found in cache: {}", comparativeId);
            return ResponseEntity.status(404).body(
                Map.of("error", "Benchmark results not found or expired", "benchmarkId", comparativeId)
            );
        }

        logger.info("Found comparative result: {}", comparativeId);
        return ResponseEntity.ok(result);
    }

    /**
     * Restart PTALIGN Flask servers for clean measurement state.
     * Call between benchmark runs when testing PTALIGN.
     */
    @PostMapping("/restart-ptalign-servers")
    public ResponseEntity<?> restartPtalignServers() {
        logger.info("Received request to restart PTALIGN servers");
        
        try {
            processTreeAlignmentStrategy.restartServers();
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "PTALIGN servers restarted"
            ));
        } catch (Exception e) {
            logger.error("Failed to restart PTALIGN servers", e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }
}

