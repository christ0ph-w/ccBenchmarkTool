package com.benchmarktool.api.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class PathResolver {
    private static final Logger logger = LogManager.getLogger(PathResolver.class);
    
    @Value("${benchmark.data.directory:../data}")
    private String dataDirectoryConfig;
    
    /**
     * Resolve a relative path to an absolute path within the data directory. 
     * 
     * @param relativePath The relative path (e.g., "20250915175732_data/test.xes")
     * @return The absolute path as a string
     * @throws IllegalArgumentException if the path escapes the data directory or doesn't exist
     */
    public String resolvePath(String relativePath) {
        if (relativePath == null || relativePath.isEmpty()) {
            throw new IllegalArgumentException("Path cannot be null or empty");
        }
        
        try {
            // If already absolute, validate it's within data directory
            if (new File(relativePath).isAbsolute()) {
                return validatePathIsInDataDirectory(relativePath);
            }
            
            // Get the base data directory
            Path dataDir = getDataDirectory();
            
            // Normalize the relative path (convert forward slashes to OS-specific separator)
            String normalizedRelativePath = relativePath.replace("/", File.separator);
            
            // Resolve the path
            Path resolvedPath = dataDir.resolve(normalizedRelativePath);
            
            // Normalize to remove any ".." or "." components
            Path normalizedPath = resolvedPath.normalize();
            
            // Validate the path is within the data directory (prevents directory traversal)
            validatePathIsInDataDirectory(normalizedPath.toString());
            
            logger.debug("Resolved path: '{}' -> '{}'", relativePath, normalizedPath);
            
            return normalizedPath.toString();
            
        } catch (Exception e) {
            logger.error("Failed to resolve path: {}", relativePath, e);
            throw new IllegalArgumentException("Invalid path: " + relativePath, e);
        }
    }
    
    /**
     * Get the absolute path to the data directory.
     * 
     * @return Path object pointing to the data directory
     * @throws IllegalArgumentException if the data directory doesn't exist
     */
    public Path getDataDirectory() {
        try {
            String appDir = System.getProperty("user.dir");
            Path currentDir = Paths.get(appDir);
            Path dataDir = currentDir.resolve(dataDirectoryConfig).normalize();
            
            logger.debug("App working directory: {}", appDir);
            logger.debug("Data directory config: {}", dataDirectoryConfig);
            logger.debug("Resolved data directory: {}", dataDir);
            
            if (!Files.exists(dataDir)) {
                throw new IllegalArgumentException(
                    String.format("Data directory does not exist: %s", dataDir)
                );
            }
            
            if (!Files.isDirectory(dataDir)) {
                throw new IllegalArgumentException(
                    String.format("Data path is not a directory: %s", dataDir)
                );
            }
            
            return dataDir;
            
        } catch (Exception e) {
            logger.error("Failed to get data directory", e);
            throw new IllegalArgumentException("Cannot access data directory", e);
        }
    }
    
    /**
     * Validate that a path is within the data directory. 
     * This prevents directory traversal attacks.
     * 
     * @param absolutePath The absolute path to validate
     * @return The validated absolute path as a string
     * @throws IllegalArgumentException if the path is outside the data directory
     */
    private String validatePathIsInDataDirectory(String absolutePath) {
        try {
            Path dataDir = getDataDirectory();
            Path resolvedPath = Paths.get(absolutePath).normalize();
            
            // Check if the resolved path starts with the data directory path
            if (!resolvedPath.startsWith(dataDir)) {
                throw new IllegalArgumentException(
                    String.format("Path is outside data directory: %s", absolutePath)
                );
            }
            
            logger.debug("Path validation passed: {}", absolutePath);
            return resolvedPath.toString();
            
        } catch (Exception e) {
            logger.error("Path validation failed: {}", absolutePath, e);
            throw new IllegalArgumentException("Invalid path: " + absolutePath, e);
        }
    }
}
