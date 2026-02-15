package com.benchmarktool.api.model;

/**
 * Response for async comparative benchmark start
 */
public class BenchmarkCompareResponse {
    private String comparativeId;
    private String statusUrl;
    private String streamUrl;  // ← ADD THIS

    public BenchmarkCompareResponse() {}

    public BenchmarkCompareResponse(String comparativeId, String statusUrl, String streamUrl) {
        this.comparativeId = comparativeId;
        this.statusUrl = statusUrl;
        this.streamUrl = streamUrl;  // ← ADD THIS
    }

    public String getComparativeId() {
        return comparativeId;
    }

    public void setComparativeId(String comparativeId) {
        this.comparativeId = comparativeId;
    }

    public String getStatusUrl() {
        return statusUrl;
    }

    public void setStatusUrl(String statusUrl) {
        this.statusUrl = statusUrl;
    }

    public String getStreamUrl() {  // ← ADD THIS
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {  // ← ADD THIS
        this.streamUrl = streamUrl;
    }
}
