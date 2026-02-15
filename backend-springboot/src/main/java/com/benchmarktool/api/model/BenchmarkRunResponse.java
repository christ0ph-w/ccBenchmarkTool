package com.benchmarktool.api.model;

/**
 * Response for async benchmark start
 * Returns immediately with IDs for tracking progress and retrieving results
 */
public class BenchmarkRunResponse {
    private String benchmarkId;
    private String statusUrl;
    private String streamUrl;

    public BenchmarkRunResponse() {}

    public BenchmarkRunResponse(String benchmarkId, String statusUrl, String streamUrl) {
        this.benchmarkId = benchmarkId;
        this.statusUrl = statusUrl;
        this.streamUrl = streamUrl;
    }

    public String getBenchmarkId() {
        return benchmarkId;
    }

    public void setBenchmarkId(String benchmarkId) {
        this.benchmarkId = benchmarkId;
    }

    public String getStatusUrl() {
        return statusUrl;
    }

    public void setStatusUrl(String statusUrl) {
        this.statusUrl = statusUrl;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }
}
