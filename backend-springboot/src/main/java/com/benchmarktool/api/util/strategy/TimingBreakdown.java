package com.benchmarktool.api.util.strategy;

/**
 * Detailed timing breakdown for alignment operations.
 * Separates computation time from overhead (I/O, network, parsing).
 */
public class TimingBreakdown {
    private final long totalMs;
    private final long computeMs;
    private final long overheadMs;
    private final Long parseMs;      // Optional: XES parsing time
    private final Long networkMs;    // Optional: HTTP round-trip (Flask only)

    private TimingBreakdown(Builder builder) {
        this.totalMs = builder.totalMs;
        this.computeMs = builder.computeMs;
        this.overheadMs = builder.overheadMs;
        this.parseMs = builder.parseMs;
        this.networkMs = builder.networkMs;
    }

    public long getTotalMs() { return totalMs; }
    public long getComputeMs() { return computeMs; }
    public long getOverheadMs() { return overheadMs; }
    public Long getParseMs() { return parseMs; }
    public Long getNetworkMs() { return networkMs; }

    /**
     * Compute efficiency: what fraction of time was actual computation
     */
    public double getEfficiency() {
        return totalMs > 0 ? (double) computeMs / totalMs : 1.0;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private long totalMs;
        private long computeMs;
        private long overheadMs;
        private Long parseMs;
        private Long networkMs;

        public Builder totalMs(long totalMs) {
            this.totalMs = totalMs;
            return this;
        }

        public Builder computeMs(long computeMs) {
            this.computeMs = computeMs;
            return this;
        }

        public Builder overheadMs(long overheadMs) {
            this.overheadMs = overheadMs;
            return this;
        }

        public Builder parseMs(Long parseMs) {
            this.parseMs = parseMs;
            return this;
        }

        public Builder networkMs(Long networkMs) {
            this.networkMs = networkMs;
            return this;
        }

        public TimingBreakdown build() {
            // Auto-calculate overhead if not set
            if (overheadMs == 0 && totalMs > 0) {
                overheadMs = totalMs - computeMs;
            }
            return new TimingBreakdown(this);
        }
    }

    @Override
    public String toString() {
        return String.format("TimingBreakdown{total=%dms, compute=%dms, overhead=%dms, efficiency=%.1f%%}",
                totalMs, computeMs, overheadMs, getEfficiency() * 100);
    }
}
