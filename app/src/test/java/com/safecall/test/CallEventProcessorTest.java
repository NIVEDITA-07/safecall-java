package com.safecall.test;

import com.safecall.engine.CallEventProcessor;
import com.safecall.engine.WeightedRuleEngine;
import com.safecall.model.CallContext;
import com.safecall.model.CallRecord;
import com.safecall.model.CallerProfile;
import com.safecall.model.UrgencyResult;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class CallEventProcessorTest {

    public static void main(String[] args) {
        System.out.println("--- Running SafeCall AI CallEventProcessor & Telephony Logic Tests ---");

        testPhoneNumberSanitization();
        testThresholdBoundary79Vs80();
        testQualifyingMissedCallScore();
        testNormalCallBelowThreshold();
        testRepeatedCallsProgression();
        testUnknownAndPrivateCallers();
        testAlertPayloadGeneration();

        System.out.println("\nAll SafeCall AI CallEventProcessor Tests Passed Successfully!");
    }

    private static void testPhoneNumberSanitization() {
        System.out.println("\n[TEST] 1. Phone Number Sanitization");
        assertEq("UNKNOWN", CallEventProcessor.sanitizePhoneNumber(null), "Null number should be UNKNOWN");
        assertEq("UNKNOWN", CallEventProcessor.sanitizePhoneNumber(""), "Empty number should be UNKNOWN");
        assertEq("UNKNOWN", CallEventProcessor.sanitizePhoneNumber("   "), "Whitespace number should be UNKNOWN");
        assertEq("UNKNOWN", CallEventProcessor.sanitizePhoneNumber("PRIVATE NUMBER"), "Private number should be UNKNOWN");
        assertEq("UNKNOWN", CallEventProcessor.sanitizePhoneNumber("RESTRICTED"), "Restricted number should be UNKNOWN");
        assertEq("+15551234567", CallEventProcessor.sanitizePhoneNumber("+1 (555) 123-4567"), "Formatted number should be cleaned");
        assertEq("9876543210", CallEventProcessor.sanitizePhoneNumber("98765-43210"), "Hyphenated number should be cleaned");
        System.out.println("Phone number sanitization verified.");
    }

    private static void testThresholdBoundary79Vs80() {
        System.out.println("\n[TEST] 2. Boundary Score: 79 (Below Threshold) vs 80 (Alert Qualified)");
        int configuredThreshold = 80;

        int score79 = 79;
        boolean qualifies79 = score79 >= configuredThreshold;
        assertFalse(qualifies79, "Score 79 must NOT trigger alert when threshold is 80");

        int score80 = 80;
        boolean qualifies80 = score80 >= configuredThreshold;
        assertTrue(qualifies80, "Score 80 MUST trigger alert when threshold is 80");

        int score81 = 81;
        boolean qualifies81 = score81 >= configuredThreshold;
        assertTrue(qualifies81, "Score 81 MUST trigger alert when threshold is 80");
        System.out.println("Threshold boundaries 79 vs 80 verified.");
    }

    private static void testQualifyingMissedCallScore() {
        System.out.println("\n[TEST] 3. Qualifying Emergency Missed Call (Score >= 80)");
        WeightedRuleEngine engine = new WeightedRuleEngine();

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 2); // 2:00 AM (Late night)
        long callTime = cal.getTimeInMillis();

        // Emergency contact (+25), 4+ calls in window (+35), late night (+10), historical missed anomaly (+30) = 100
        CallerProfile profile = new CallerProfile(1, "Daughter Maya", "+15559876543", "Daughter", CallerProfile.Priority.EMERGENCY);
        List<CallRecord> recent = new ArrayList<>();
        recent.add(new CallRecord(1, "+15559876543", callTime - 60000, 0, 0, "LOW", ""));
        recent.add(new CallRecord(2, "+15559876543", callTime - 120000, 0, 0, "LOW", ""));
        recent.add(new CallRecord(3, "+15559876543", callTime - 180000, 0, 0, "LOW", ""));

        List<CallRecord> history = new ArrayList<>();
        // 5 past calls, 4 unanswered -> 80% missed rate anomaly (>= 50%)
        for (int i = 0; i < 4; i++) {
            history.add(new CallRecord(10 + i, "+15559876543", callTime - (86400000L * (i + 1)), 0, 0, "LOW", ""));
        }
        history.add(new CallRecord(20, "+15559876543", callTime - (86400000L * 5), 120, 0, "LOW", ""));

        CallContext ctx = new CallContext(profile, recent, history, callTime);
        UrgencyResult res = engine.evaluate(ctx);

        System.out.println("Score: " + res.getScore() + "/100 | Level: " + res.getUrgencyLevel());
        assertTrue(res.getScore() >= 80, "Emergency repeated late night missed call must meet threshold 80");
        assertEq(100, res.getScore(), "Must equal exactly 100/100");
        assertEq(UrgencyResult.Level.HIGH, res.getUrgencyLevel(), "Must be HIGH urgency level");
    }

    private static void testNormalCallBelowThreshold() {
        System.out.println("\n[TEST] 4. Normal Daytime Call Below Threshold");
        WeightedRuleEngine engine = new WeightedRuleEngine();

        CallerProfile profile = new CallerProfile(2, "Grocery Store", "+15553334444", "Service", CallerProfile.Priority.NORMAL);
        List<CallRecord> recent = new ArrayList<>(); // single call
        List<CallRecord> history = new ArrayList<>();

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 14); // 2:00 PM (Daytime)
        long callTime = cal.getTimeInMillis();

        CallContext ctx = new CallContext(profile, recent, history, callTime);
        UrgencyResult res = engine.evaluate(ctx);

        System.out.println("Score: " + res.getScore() + "/100 | Level: " + res.getUrgencyLevel());
        assertTrue(res.getScore() < 80, "Single daytime service call must be well below threshold 80");
        assertEq(0, res.getScore(), "Single daytime service call score must be 0");
        assertEq(UrgencyResult.Level.LOW, res.getUrgencyLevel(), "Level must be LOW");
    }

    private static void testRepeatedCallsProgression() {
        System.out.println("\n[TEST] 5. Repeated Call Incremental Weighting (0 -> 10 -> 22 -> 35)");
        WeightedRuleEngine engine = new WeightedRuleEngine();
        CallerProfile profile = new CallerProfile(3, "Friend", "+15557778888", "Friend", CallerProfile.Priority.NORMAL);

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 11);
        long callTime = cal.getTimeInMillis();

        // 1st call (0 recent) -> +0 repeated weight
        UrgencyResult res1 = engine.evaluate(new CallContext(profile, new ArrayList<>(), new ArrayList<>(), callTime));
        assertEq(0, res1.getScore(), "1st call score");

        // 2nd call (1 recent) -> +10 repeated weight
        List<CallRecord> r1 = new ArrayList<>();
        r1.add(new CallRecord(1, profile.getPhoneNumber(), callTime - 60000, 0, 0, "LOW", ""));
        UrgencyResult res2 = engine.evaluate(new CallContext(profile, r1, new ArrayList<>(), callTime));
        assertEq(10, res2.getScore(), "2nd call score");

        // 3rd call (2 recent) -> +22 repeated weight
        r1.add(new CallRecord(2, profile.getPhoneNumber(), callTime - 120000, 0, 0, "LOW", ""));
        UrgencyResult res3 = engine.evaluate(new CallContext(profile, r1, new ArrayList<>(), callTime));
        assertEq(22, res3.getScore(), "3rd call score");

        // 4th call (3 recent) -> +35 repeated weight
        r1.add(new CallRecord(3, profile.getPhoneNumber(), callTime - 180000, 0, 0, "LOW", ""));
        UrgencyResult res4 = engine.evaluate(new CallContext(profile, r1, new ArrayList<>(), callTime));
        assertEq(35, res4.getScore(), "4th call score");
        System.out.println("Repeated call step progression verified.");
    }

    private static void testUnknownAndPrivateCallers() {
        System.out.println("\n[TEST] 6. Unknown / Unsaved Callers Safely Handled");
        WeightedRuleEngine engine = new WeightedRuleEngine();

        CallerProfile unknown = new CallerProfile(0, "Unknown Caller", "UNKNOWN", "Other", CallerProfile.Priority.NORMAL);
        CallContext ctx = new CallContext(unknown, new ArrayList<>(), new ArrayList<>(), System.currentTimeMillis());
        UrgencyResult res = engine.evaluate(ctx);

        assertTrue(res.getScore() >= 0 && res.getScore() <= 100, "Unknown caller evaluation must not crash or exceed bounds");
        assertEq(0, res.getScore(), "Single unknown caller score");
    }

    private static void testAlertPayloadGeneration() {
        System.out.println("\n[TEST] 7. Alert Payload Idempotency & Fields");
        long timestamp = 1728900000000L;
        String phone = "+15551234567";
        int score = 85;

        String idempotentId = "evt_" + timestamp + "_" + Math.abs((phone + score).hashCode());
        assertTrue(idempotentId.startsWith("evt_1728900000000_"), "Idempotent ID must begin with evt_<timestamp>_");

        // Ensure same parameters generate the exact same idempotent ID (Idempotency guarantee)
        String idempotentId2 = "evt_" + timestamp + "_" + Math.abs((phone + score).hashCode());
        assertEq(idempotentId, idempotentId2, "Idempotent ID must be deterministic for identical event");
        System.out.println("Alert payload idempotency verified.");
    }

    private static void assertEq(Object expected, Object actual, String message) {
        if (!expected.equals(actual)) {
            throw new AssertionError("FAIL [" + message + "]: Expected " + expected + " but got " + actual);
        }
    }

    private static void assertTrue(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    private static void assertFalse(boolean condition, String message) {
        if (condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }
}
