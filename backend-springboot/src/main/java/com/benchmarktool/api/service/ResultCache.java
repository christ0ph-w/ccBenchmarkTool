package com.benchmarktool.api.service;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * In-memory cache for benchmark results with automatic expiration (5 min TTL)
 */
@Component
public class ResultCache {
    private static final Logger logger = LogManager.getLogger(ResultCache.class);
    private static final long TTL_MILLISECONDS = 5 * 60 * 1000; // 5 minutes

    private record CacheEntry<T>(T data, long expiresAt) {}

    private final ConcurrentHashMap<String, CacheEntry<?>> cache = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleanupExecutor = Executors.newScheduledThreadPool(1);

    public ResultCache() {
        // Schedule cleanup task to run every 1 minute
        cleanupExecutor.scheduleAtFixedRate(
            this::cleanup,
            1, // initial delay
            1, // repeat interval
            TimeUnit.MINUTES
        );
        logger.info("ResultCache initialized with 5-minute TTL");
    }

    /**
     * Cache a result with automatic expiration
     */
    public <T> void cache(String key, T data) {
        long expiresAt = System.currentTimeMillis() + TTL_MILLISECONDS;
        cache.put(key, new CacheEntry<>(data, expiresAt));
        logger.debug("Cached result: {} (expires at {})", key, expiresAt);
    }

    /**
     * Retrieve a cached result if it exists and hasn't expired
     */
    @SuppressWarnings("unchecked")
    public <T> T retrieve(String key, Class<T> type) {
        CacheEntry<?> entry = cache.get(key);

        if (entry == null) {
            return null;
        }

        if (System.currentTimeMillis() > entry.expiresAt) {
            cache.remove(key);
            return null;
        }

        return (T) entry.data;
    }

    /**
     * Check if a result exists in cache and hasn't expired
     */
    public boolean exists(String key) {
        CacheEntry<?> entry = cache.get(key);

        if (entry == null) {
            return false;
        }

        if (System.currentTimeMillis() > entry.expiresAt) {
            cache.remove(key);
            return false;
        }

        return true;
    }

    /**
     * Remove expired entries from cache
     */
    private void cleanup() {
        long now = System.currentTimeMillis();
        int sizeBefore = cache.size();
        cache.entrySet().removeIf(entry -> now > entry.getValue().expiresAt);
        if (sizeBefore > 0) {
            logger.debug("Cache cleanup: {} -> {} entries", sizeBefore, cache.size());
        }
    }

    /**
     * Clear all cache (for testing/admin purposes)
     */
    public void clear() {
        cache.clear();
        logger.info("Cache cleared");
    }
}