package com.safecall.model;

import java.util.List;

public class CallContext {
    private CallerProfile profile;
    private List<CallRecord> recentCalls;
    private List<CallRecord> historicalCalls;
    private long currentCallTime;
    private CallOutcome callOutcome;

    public CallContext(CallerProfile profile, List<CallRecord> recentCalls, 
                       List<CallRecord> historicalCalls, long currentCallTime,
                       CallOutcome callOutcome) {
        this.profile = profile;
        this.recentCalls = recentCalls;
        this.historicalCalls = historicalCalls;
        this.currentCallTime = currentCallTime;
        this.callOutcome = (callOutcome != null) ? callOutcome : CallOutcome.UNKNOWN;
    }

    public CallContext(CallerProfile profile, List<CallRecord> recentCalls, 
                       List<CallRecord> historicalCalls, long currentCallTime) {
        this(profile, recentCalls, historicalCalls, currentCallTime, CallOutcome.UNKNOWN);
    }

    public CallerProfile getProfile() { return profile; }
    public List<CallRecord> getRecentCalls() { return recentCalls; }
    public List<CallRecord> getHistoricalCalls() { return historicalCalls; }
    public long getCurrentCallTime() { return currentCallTime; }
    public CallOutcome getCallOutcome() { return callOutcome; }
}
