package com.benchmarktool.api.service;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import com.benchmarktool.api.model.BenchmarkRequest;
import com.benchmarktool.api.model.BenchmarkResult;
import com.benchmarktool.api.model.LogBenchmarkResult;
import com.benchmarktool.api.util.PathResolver;
import com.benchmarktool.api.util.PNLoader;
import com.benchmarktool.api.util.XESLoader;
import com.benchmarktool.api.util.strategy.*;

import org.deckfour.xes.model.XLog;
import org.processmining.models.graphbased.directed.petrinet.Petrinet;
import org.processmining.models.semantics.petrinet.Marking;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Component
public class BenchmarkExecutor {
    private static final Logger logger = LogManager.getLogger(BenchmarkExecutor.class);

    private final PathResolver pathResolver;
    private final AlignmentStrategyRegistry strategyRegistry;
    private final BenchmarkResultExporter resultExporter;

    private static final Object BENCHMARK_LOCK = new Object();

    public BenchmarkExecutor(PathResolver pathResolver,
                             AlignmentStrategyRegistry strategyRegistry,
                             BenchmarkResultExporter resultExporter) {
        this.pathResolver = pathResolver;
        this.strategyRegistry = strategyRegistry;
        this.resultExporter = resultExporter;
    }

    public BenchmarkResult executeBenchmark(BenchmarkRequest request, String benchmarkId) {
        AlignmentStrategy strategy = strategyRegistry.getStrategy(request.getAlgorithm());
        return executeBenchmark(request, strategy, benchmarkId);
    }

    public BenchmarkResult executeBenchmark(BenchmarkRequest request, AlignmentStrategy strategy, String benchmarkId) {
        synchronized (BENCHMARK_LOCK) {
            logger.info("Starting benchmark: {}", benchmarkId);
            logger.info("Algorithm: {} ({})", strategy.getName(), strategy.getModelType());

            BenchmarkResult result = new BenchmarkResult();
            result.setBenchmarkId(benchmarkId);
            result.setAlgorithm(request.getAlgorithm());

            int numThreads = getNumThreads(request.getNumThreads());
            result.setNumThreads(numThreads);

            long startTime = System.currentTimeMillis();
            long peakMemory = getMemoryUsed();
            String logDirectory = null;  // Changed from dataDirectory

            try {
                String modelPath = resolveModelPath(request, strategy.getModelType());
                logDirectory = pathResolver.resolvePath(request.getLogDirectory());  // Store logDir here

                result.setModelFile(new File(modelPath).getName());
                logger.info("Model: {}", modelPath);
                logger.info("Log Directory: {}", logDirectory);

                List<Path> xesFiles = getXesFilesFromDirectory(logDirectory);
                logger.info("Found {} XES files", xesFiles.size());

                if (xesFiles.isEmpty()) {
                    result.setSuccess(false);
                    result.setErrorMessage("No XES files found in directory: " + logDirectory);
                    return result;
                }

                // For PTALIGN: ensure Python servers are running and configure
                if (strategy instanceof ProcessTreeAlignmentStrategy) {
                    ProcessTreeAlignmentStrategy ptStrategy = (ProcessTreeAlignmentStrategy) strategy;
                    logger.info("Starting {} Python alignment servers...", numThreads);
                    ptStrategy.ensureServersRunning(numThreads, modelPath);
                    
                    // Configure options from request
                    ptStrategy.setUseBounds(request.getUseBounds());
                    ptStrategy.setUseWarmStart(request.getUseWarmStart());
                    ptStrategy.setBoundThreshold(request.getBoundThreshold());
                    ptStrategy.setBoundedSkipStrategy(request.getBoundedSkipStrategy());
                    ptStrategy.setPropagateCosts(request.getPropagateCostsAcrossClusters());

                    // Reset accumulated costs at start of benchmark if not propagating
                    if (!request.getPropagateCostsAcrossClusters()) {
                        ptStrategy.resetAccumulatedCosts();
                    }
                    
                    logger.info("PTALIGN config: bounds={}, warmStart={}, threshold={}, strategy={}, propagate={}",
                        request.getUseBounds(), request.getUseWarmStart(), 
                        request.getBoundThreshold(), request.getBoundedSkipStrategy(),
                        request.getPropagateCostsAcrossClusters());

                    Map<String, Object> configMap = new HashMap<>();
                    configMap.put("useBounds", request.getUseBounds());
                    configMap.put("useWarmStart", request.getUseWarmStart());
                    configMap.put("boundThreshold", request.getUseBounds() ? request.getBoundThreshold() : null);
                    configMap.put("boundedSkipStrategy", request.getUseBounds() ? request.getBoundedSkipStrategy() : null);
                    configMap.put("propagateCosts", request.getPropagateCostsAcrossClusters());
                    result.setPtalignConfig(configMap);
                }

                ModelData modelData = loadModel(strategy.getModelType(), modelPath);

                logger.info("Using PARALLEL mode with {} threads", numThreads);
                List<LogBenchmarkResult> logResults = processLogsInParallel(
                    xesFiles, modelData, strategy, numThreads
                );

                peakMemory = Math.max(peakMemory, getMemoryUsed());
                result.setLogResults(logResults);
                result.setSuccess(!logResults.isEmpty());

            } catch (Exception e) {
                logger.error("Benchmark failed", e);
                result.setSuccess(false);
                result.setErrorMessage(e.getMessage());
            }

            result.setEndTime(LocalDateTime.now());
            result.setTotalExecutionTimeMs(System.currentTimeMillis() - startTime);
            result.setPeakMemoryMb(peakMemory / (1024 * 1024));

            logger.info("Benchmark completed: {}ms, {} MB peak memory",
                result.getTotalExecutionTimeMs(), result.getPeakMemoryMb());

            // Now pass logDirectory instead of dataDirectory
            if (logDirectory != null && !result.getLogResults().isEmpty()) {
                resultExporter.exportResult(result, strategy.getName(), result.getModelFile(), logDirectory);
            }

            return result;
        }
    }

    private String resolveModelPath(BenchmarkRequest request, ModelType modelType) {
        String modelPath = request.getModelPathForType(modelType.getFileExtension());
        if (modelPath == null || modelPath.isEmpty()) {
            throw new IllegalArgumentException(
                "No " + modelType.getFileExtension() + " model path provided for algorithm requiring " + modelType
            );
        }
        return pathResolver.resolvePath(modelPath);
    }

    private static class ModelData {
        final Petrinet petriNet;
        final Marking initialMarking;
        final Marking[] finalMarkings;
        final String processTreePath;

        ModelData(Petrinet petriNet, Marking initialMarking, Marking[] finalMarkings) {
            this.petriNet = petriNet;
            this.initialMarking = initialMarking;
            this.finalMarkings = finalMarkings;
            this.processTreePath = null;
        }

        ModelData(String processTreePath) {
            this.petriNet = null;
            this.initialMarking = null;
            this.finalMarkings = null;
            this.processTreePath = processTreePath;
        }
    }

    private ModelData loadModel(ModelType modelType, String modelPath) throws Exception {
        if (modelType == ModelType.PETRI_NET) {
            logger.info("Loading Petri net model...");
            Object[] data = PNLoader.loadWorkflowPetriNet(modelPath);
            Petrinet petriNet = (Petrinet) data[0];
            Marking initialMarking = (Marking) data[1];
            Marking[] finalMarkings = (Marking[]) data[2];
            logger.info("Model loaded: {} places, {} transitions",
                petriNet.getPlaces().size(), petriNet.getTransitions().size());
            return new ModelData(petriNet, initialMarking, finalMarkings);
        } else {
            logger.info("Using Process Tree model: {}", modelPath);
            return new ModelData(modelPath);
        }
    }

    private List<LogBenchmarkResult> processLogsInParallel(
            List<Path> xesFiles,
            ModelData modelData,
            AlignmentStrategy strategy,
            int numThreads) throws InterruptedException {

        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        List<Future<LogBenchmarkResult>> futures = new ArrayList<>();

        try {
            for (Path xesFile : xesFiles) {
                Future<LogBenchmarkResult> future = executor.submit(() ->
                    processLogFile(xesFile, modelData, strategy)
                );
                futures.add(future);
            }

            List<LogBenchmarkResult> results = new ArrayList<>();
            for (Future<LogBenchmarkResult> future : futures) {
                try {
                    LogBenchmarkResult logResult = future.get(180, TimeUnit.MINUTES);
                    results.add(logResult);
                    logger.info("Completed: {}", logResult.getLogName());
                } catch (TimeoutException e) {
                    logger.error("Timeout processing log file", e);
                    future.cancel(true);
                } catch (Exception e) {
                    logger.error("Error processing log file", e);
                }
            }
            return results;
        } finally {
            executor.shutdown();
            executor.awaitTermination(1, TimeUnit.MINUTES);
        }
    }

    private LogBenchmarkResult processLogFile(
            Path xesPath,
            ModelData modelData,
            AlignmentStrategy strategy) {

        String logName = xesPath.getFileName().toString();
        logger.info("Processing: {} with {}", logName, strategy.getName());

        logger.info("[{}] Processing {}", 
            Thread.currentThread().getName(),
            xesPath.getFileName());

        long startMemory = getMemoryUsed();

        try {
            AlignmentResult alignmentResult;

            if (strategy instanceof ProcessTreeAlignmentStrategy) {
                ProcessTreeAlignmentStrategy ptStrategy = (ProcessTreeAlignmentStrategy) strategy;
                String distanceMatrixPath = findDistanceMatrix(xesPath);

                alignmentResult = ptStrategy.computeAlignmentFromFile(
                    xesPath.toAbsolutePath().toString(),
                    modelData.processTreePath,
                    distanceMatrixPath
                );
            } else {
                XLog log = XESLoader.loadXES(xesPath.toFile());
                AlignmentInput.Builder inputBuilder = AlignmentInput.builder().log(log);

                if (modelData.petriNet != null) {
                    inputBuilder.petriNet(modelData.petriNet, modelData.initialMarking, modelData.finalMarkings);
                }

                alignmentResult = strategy.computeAlignment(inputBuilder.build());
            }

            long memoryUsed = (getMemoryUsed() - startMemory) / (1024 * 1024);

            LogBenchmarkResult result = new LogBenchmarkResult(
                logName,
                alignmentResult.getTotalTraces(),
                alignmentResult.getTotalVariants(),
                alignmentResult.getSuccessfulAlignments(),
                alignmentResult.getFailedAlignments(),
                alignmentResult.getAvgFitness(),
                alignmentResult.getAvgCost(),
                alignmentResult.getExecutionTimeMs(),
                memoryUsed,
                alignmentResult.getTiming(),
                alignmentResult.getOptimizationStats(),
                alignmentResult.getAlignments(),
                alignmentResult.getBoundsProgression(),
                alignmentResult.getGlobalBoundsProgression()
            );

            result.setShortestPathCost(alignmentResult.getShortestPathCost());

            logger.info("{} - Fitness: {}, Cost: {}, Variants: {}, Time: {}ms{}",
                logName,
                String.format("%.4f", alignmentResult.getAvgFitness()),
                String.format("%.2f", alignmentResult.getAvgCost()),
                alignmentResult.getTotalVariants(),
                alignmentResult.getExecutionTimeMs(),
                alignmentResult.getTiming() != null 
                    ? String.format(" (compute: %dms, efficiency: %.1f%%)", 
                        alignmentResult.getTiming().getComputeMs(),
                        alignmentResult.getTiming().getEfficiency() * 100)
                    : "");

            return result;

        } catch (Exception e) {
            logger.error("Failed to process {}: {}", logName, e.getMessage(), e);

            LogBenchmarkResult failedResult = new LogBenchmarkResult();
            failedResult.setLogName(logName);
            failedResult.setAvgFitness(0);
            failedResult.setAvgCost(Double.MAX_VALUE);
            failedResult.setFailedAlignments(1);
            return failedResult;
        }
    }

    private String findDistanceMatrix(Path logPath) {
        String logName = logPath.getFileName().toString().replaceFirst("\\.xes$", "");
        
        Path distanceMatrixDir = logPath.getParent().resolve("distance_matrix");
        Path distanceMatrixFile = distanceMatrixDir.resolve(logName + "_distance_nosub.json");
        
        if (Files.exists(distanceMatrixFile)) {
            logger.info("Found distance matrix: {}", distanceMatrixFile);
            return distanceMatrixFile.toAbsolutePath().toString();
        }
        
        Path parentDir = logPath.getParent();
        Path parentDistanceMatrixDir = parentDir.getParent().resolve("distance_matrix");
        
        String directoryName = parentDir.getFileName().toString();
        String baseLogName = extractBaseLogName(directoryName);
        
        Path baseDistanceMatrixFile = parentDistanceMatrixDir.resolve(baseLogName + "_distance_nosub.json");
        
        if (Files.exists(baseDistanceMatrixFile)) {
            logger.info("Found distance matrix (from directory {}): {}", directoryName, baseDistanceMatrixFile);
            return baseDistanceMatrixFile.toAbsolutePath().toString();
        }
        
        String logBaseLogName = extractBaseLogName(logName);
        if (!logBaseLogName.equals(baseLogName)) {
            Path logBaseDistanceMatrixFile = parentDistanceMatrixDir.resolve(logBaseLogName + "_distance_nosub.json");
            if (Files.exists(logBaseDistanceMatrixFile)) {
                logger.info("Found distance matrix (from log name): {}", logBaseDistanceMatrixFile);
                return logBaseDistanceMatrixFile.toAbsolutePath().toString();
            }
        }
        
        logger.debug("No distance matrix found for: {} (tried base names: '{}', '{}')", 
            logName, baseLogName, logBaseLogName);
        return null;
    }

    private String extractBaseLogName(String name) {
        String[] splitPatterns = {"_hierarchical_", "_dbscan_", "_random_variant_split_", "_random_split_"};
        
        for (String pattern : splitPatterns) {
            int idx = name.indexOf(pattern);
            if (idx > 0) {
                return name.substring(0, idx);
            }
        }
        
        String[] regexPatterns = {
            "_cluster_\\d+$",
            "_random_variant_split_\\d+$", 
            "_random_split_\\d+$"
        };
        
        String result = name;
        for (String pattern : regexPatterns) {
            result = result.replaceAll(pattern, "");
        }
        
        return result;
    }

    private int getNumThreads(Integer requestedThreads) {
        int maxAvailable = Runtime.getRuntime().availableProcessors();
        if (requestedThreads == null || requestedThreads <= 0) {
            return maxAvailable;
        }
        return Math.min(requestedThreads, maxAvailable);
    }

    private List<Path> getXesFilesFromDirectory(String logPath) {
        Path path = Paths.get(logPath);

        if (Files.isRegularFile(path) && logPath.toLowerCase().endsWith(".xes")) {
            return List.of(path);
        }

        if (!Files.isDirectory(path)) {
            throw new IllegalArgumentException("Directory not found: " + logPath);
        }

        try (var stream = Files.list(path)) {
            return stream
                .filter(p -> p.toString().toLowerCase().endsWith(".xes"))
                .sorted()
                .toList();
        } catch (IOException e) {
            throw new RuntimeException("Error reading directory: " + logPath, e);
        }
    }

    private long getMemoryUsed() {
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }
}