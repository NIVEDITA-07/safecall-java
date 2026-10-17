package com.safecall.zk;

import org.zkoss.bind.annotation.Command;
import org.zkoss.bind.annotation.Init;
import org.zkoss.bind.annotation.NotifyChange;
import com.safecall.engine.WeightedRuleEngine;
import com.safecall.model.CallContext;
import com.safecall.model.CallerProfile;
import com.safecall.model.CallRecord;
import com.safecall.model.UrgencyResult;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class DashboardViewModel {
    private String callerName = "Mom";
    private CallerProfile.Priority selectedPriority = CallerProfile.Priority.TRUSTED;
    private int recentCallCount = 0;
    private int callHour = 14;
    private UrgencyResult lastResult;
    private WeightedRuleEngine engine;

    @Init
    public void init() {
        engine = new WeightedRuleEngine();
    }

    public List<CallerProfile.Priority> getPriorities() {
        return List.of(CallerProfile.Priority.values());
    }

    @Command
    @NotifyChange({"lastResult", "levelColor"})
    public void simulateCall() {
        // Build mock profile
        CallerProfile profile = new CallerProfile(1, callerName, "555-0000", "Simulated", selectedPriority);
        
        // Build mock recent history based on the spinner
        List<CallRecord> recent = new ArrayList<>();
        for (int i = 0; i < recentCallCount; i++) {
            recent.add(new CallRecord(0, "555-0000", System.currentTimeMillis(), 30, 0, "", ""));
        }
        
        // Build mock time
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, callHour);
        
        // Run core engine logic reused directly from the Android 'app' module
        CallContext context = new CallContext(profile, recent, new ArrayList<>(), cal.getTimeInMillis());
        lastResult = engine.evaluate(context);
    }

    public String getLevelColor() {
        if (lastResult == null) return "";
        switch (lastResult.getUrgencyLevel()) {
            case HIGH: return "font-size: 16px; color: red; font-weight: bold;";
            case MEDIUM: return "font-size: 16px; color: #d68100; font-weight: bold;";
            case LOW: return "font-size: 16px; color: green; font-weight: bold;";
            default: return "font-size: 16px;";
        }
    }

    // Getters and Setters for ZK Data Binding
    public String getCallerName() { return callerName; }
    public void setCallerName(String callerName) { this.callerName = callerName; }
    
    public CallerProfile.Priority getSelectedPriority() { return selectedPriority; }
    public void setSelectedPriority(CallerProfile.Priority selectedPriority) { this.selectedPriority = selectedPriority; }
    
    public int getRecentCallCount() { return recentCallCount; }
    public void setRecentCallCount(int recentCallCount) { this.recentCallCount = recentCallCount; }
    
    public int getCallHour() { return callHour; }
    public void setCallHour(int callHour) { this.callHour = callHour; }
    
    public UrgencyResult getLastResult() { return lastResult; }
}
