package com.benchmarktool.api.util.strategy.ptalign;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages Python alignment server processes.
 * Handles starting, stopping, health checks, and load balancing.
 */
public class PythonServerManager {
    private static final Logger logger = LogManager.getLogger(PythonServerManager.class);
    
    private static final int BASE_PORT = 5001;
    private static final int MAX_SERVERS = 50;
    private static final String SERVER_HOST = "http://localhost";
    
    private final ConcurrentHashMap<Integer, Process> runningServers = new ConcurrentHashMap<>();
    private final HttpClient httpClient;
    private final String pythonExecutablePath;
    private final String pythonScriptPath;
    private final boolean isDocker;
    
    private int currentServerCount = 0;
    private int requestCounter = 0;

    public PythonServerManager() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.isDocker = detectDockerEnvironment();
        this.pythonExecutablePath = resolvePythonExecutable();
        this.pythonScriptPath = resolvePythonScriptPath();
        
        logger.info("PythonServerManager initialized (Docker: {})", isDocker);
        logger.info("Python executable: {}", pythonExecutablePath);
        logger.info("Python script: {}", pythonScriptPath);
    }

    /**
     * Detect if running inside Docker container.
     */
    private boolean detectDockerEnvironment() {
        // Check for .dockerenv file (created by Docker)
        if (new File("/.dockerenv").exists()) {
            return true;
        }
        // Check for Docker-specific cgroup
        try {
            File cgroupFile = new File("/proc/1/cgroup");
            if (cgroupFile.exists()) {
                String content = new String(java.nio.file.Files.readAllBytes(cgroupFile.toPath()));
                if (content.contains("docker") || content.contains("kubepods")) {
                    return true;
                }
            }
        } catch (IOException e) {
            // Ignore
        }
        return false;
    }

    /**
     * Ensure the specified number of servers are running.
     * @return true if servers were restarted, false if no change
     */
    public synchronized boolean ensureServersRunning(int numServers) throws Exception {
        numServers = Math.min(numServers, MAX_SERVERS);
        
        if (numServers != currentServerCount) {
            logger.info("Adjusting server count from {} to {}", currentServerCount, numServers);
            stopAllServers();
            startServers(numServers);
            currentServerCount = numServers;
            return true;
        }
        
        return false;
    }

    public synchronized void restartServers() throws Exception {
        if (currentServerCount > 0) {
            logger.info("Restarting {} servers", currentServerCount);
            int count = currentServerCount;
            stopAllServers();
            startServers(count);
            currentServerCount = count;
        }
    }

    public synchronized void stopAllServers() {
        logger.info("Stopping all alignment servers...");
        
        for (Map.Entry<Integer, Process> entry : runningServers.entrySet()) {
            int port = entry.getKey();
            Process process = entry.getValue();
            
            try {
                process.destroy();
                process.waitFor();
                logger.debug("Server on port {} stopped", port);
            } catch (Exception e) {
                logger.warn("Error stopping server on port {}: {}", port, e.getMessage());
                process.destroyForcibly();
            }
        }
        
        runningServers.clear();
        currentServerCount = 0;
        logger.info("All servers stopped");
    }

    public String getNextServerUrl() {
        if (runningServers.isEmpty()) {
            throw new IllegalStateException("No servers running");
        }
        
        int index = (requestCounter++) % currentServerCount;
        int port = BASE_PORT + index;
        return SERVER_HOST + ":" + port;
    }

    public int getServerCount() {
        return currentServerCount;
    }

    private void startServers(int count) throws Exception {
        logger.info("Starting {} alignment servers...", count);
        
        for (int i = 0; i < count; i++) {
            int port = BASE_PORT + i;
            startServer(port);
        }
        
        waitForServers(count, 30);
        logger.info("All {} servers started and ready", count);
    }

    private void startServer(int port) throws IOException {
        logger.info("Starting server on port {}...", port);
        
        ProcessBuilder pb = new ProcessBuilder(
            pythonExecutablePath,
            pythonScriptPath,
            "--port", String.valueOf(port)
        );
        
        File scriptDir = new File(pythonScriptPath).getParentFile();
        try {
            scriptDir = scriptDir.getCanonicalFile();
        } catch (IOException e) {
            scriptDir = scriptDir.getAbsoluteFile();
        }
        
        pb.directory(scriptDir);
        pb.inheritIO();
        
        Process process = pb.start();
        runningServers.put(port, process);
    }

    private void waitForServers(int count, int timeoutSeconds) throws Exception {
        long startTime = System.currentTimeMillis();
        long timeoutMs = timeoutSeconds * 1000L;
        
        while (System.currentTimeMillis() - startTime < timeoutMs) {
            int readyCount = 0;
            
            for (int i = 0; i < count; i++) {
                int port = BASE_PORT + i;
                if (isServerReady(port)) {
                    readyCount++;
                }
            }
            
            if (readyCount == count) {
                return;
            }
            
            Thread.sleep(500);
        }
        
        throw new RuntimeException("Timeout waiting for servers to start");
    }

    private boolean isServerReady(int port) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(SERVER_HOST + ":" + port + "/health"))
                .timeout(Duration.ofSeconds(2))
                .GET()
                .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    private String resolvePythonExecutable() {
        if (isDocker) {
            return "python";
        }
        
        // Windows development paths
        String[] possiblePaths = {
            "../backend-alignment/venv/Scripts/python.exe",
            "backend-alignment/venv/Scripts/python.exe"
        };

        for (String path : possiblePaths) {
            File file = new File(path);
            if (file.exists()) {
                try {
                    return file.getCanonicalPath();
                } catch (IOException e) {
                    return file.getAbsolutePath();
                }
            }
        }
        return "python";
    }

    private String resolvePythonScriptPath() {
        if (isDocker) {
            return "/app/backend-alignment/process-tree-alignment/alignment_server.py";
        }
        
        // Windows development paths
        String[] possiblePaths = {
            "../backend-alignment/process-tree-alignment/alignment_server.py",
            "backend-alignment/process-tree-alignment/alignment_server.py"
        };

        for (String path : possiblePaths) {
            File file = new File(path);
            if (file.exists()) {
                try {
                    return file.getCanonicalPath();
                } catch (IOException e) {
                    return file.getAbsolutePath();
                }
            }
        }
        return new File(possiblePaths[0]).getAbsolutePath();
    }
}