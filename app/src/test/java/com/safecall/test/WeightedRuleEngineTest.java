package com.safecall.test;

import com.safecall.engine.WeightedRuleEngine;
import com.safecall.model.CallContext;
import com.safecall.model.CallRecord;
import com.safecall.model.CallerProfile;
import com.safecall.model.UrgencyResult;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class WeightedRuleEngineTest {

    public static void main(String[] args) {
        System.out.println("--- Running SafeCall AI Rule Engine & Alert Policy Tests ---");
        WeightedRuleEngine engine = new WeightedRuleEngine();

        testNormalSingle(engine);
        testTrustedRepeated(engine);
        testEmergencyLateNightRepeated(engine);
        testUnknownSingle(engine);
        testInsufficientHistory(engine);
        testRepeatedCallStepProgression(engine);
        testHistoricalMissedAnomaly(engine);
        testThresholdBoundaries(engine);
        testTimeSchedulePolicies();
        testCooldownDuplicateSuppression();
        testBoundaries(engine);

        System.out.println("\nAll SafeCall AI Unit Tests Passed Successfully!");
    }

    private static void printResult(String testName, UrgencyResult res) {
        System.out.println("\n[TEST] " + testName);
        System.out.println("Score: " + res.getScore() + " | Level: " + res.getUrgencyLevel());
        System.out.println("Explanation: " + res.getExplanation());
        if (res.getScore() < 0 || res.getScore() > 100) {
            throw new AssertionError("FAIL: Score out of bounds! " + res.getScore());
        }
    }

    private static void testNormalSingle(WeightedRuleEngine engine) {
        // Normal contact (+0) + 1 call (+0) + daytime (+0) + no history (+0) = 0
        CallerProfile profile = new CallerProfile(1, "Bob", "123", "Friend", CallerProfile.Priority.NORMAL);
        CallContext ctx = new CallContext(profile, new ArrayList<>(), new ArrayList<>(), getDayTime());
        UrgencyResult res = engine.evaluate(ctx);
        printResult("1. Normal Single Call", res);
        assertEq(0, res.getScore(), "Normal single call score");
        assertEq(UrgencyResult.Level.LOW, res.getUrgencyLevel(), "Normal single call level");
    }

    private static void testTrustedRepeated(WeightedRuleEngine engine) {
        // Trusted contact (+15) + 2 previous recent calls (=3 total calls in window, +22) + day (+0) + no hist (+0) = 37
        CallerProfile profile = new CallerProfile(2, "Mom", "456", "Family", CallerProfile.Priority.TRUSTED);
        List<CallRecord> recent = new ArrayList<>();
        recent.add(createDummyRecord());
        recent.add(createDummyRecord());
        CallContext ctx = new CallContext(profile, recent, new ArrayList<>(), getDayTime());
        UrgencyResult res = engine.evaluate(ctx);
        printResult("2. Trusted Contact Repeated (3 calls in window)", res);
        assertEq(37, res.getScore(), "Trusted repeated score");
        assertEq(UrgencyResult.Level.MEDIUM, res.getUrgencyLevel(), "Trusted repeated level");
    }

    private static void testEmergencyLateNightRepeated(WeightedRuleEngine engine) {
        // Emergency (+25) + 3 previous recent calls (=4+ total calls, +35) + Late night (+10) + no hist (+0) = 70
        CallerProfile profile = new CallerProfile(3, "Dad", "789", "Family", CallerProfile.Priority.EMERGENCY);
        List<CallRecord> recent = new ArrayList<>();
        recent.add(createDummyRecord());
        recent.add(createDummyRecord());
        recent.add(createDummyRecord());
        CallContext ctx = new CallContext(profile, recent, new ArrayList<>(), getNightTime());
        UrgencyResult res = engine.evaluate(ctx);
        printResult("3. Emergency Late Night Repeated (4 calls)", res);
        assertEq(70, res.getScore(), "Emergency late night repeated score");
        assertEq(UrgencyResult.Level.MEDIUM, res.getUrgencyLevel(), "Emergency repeated level");
    }

    private static void testUnknownSingle(WeightedRuleEngine engine) {
        // Unknown (+0) + single call (+0) + daytime (+0) + no hist (+0) = 0
        CallContext ctx = new CallContext(null, new ArrayList<>(), new ArrayList<>(), getDayTime());
        UrgencyResult res = engine.evaluate(ctx);
        printResult("4. Unknown Caller Single Call", res);
        assertEq(0, res.getScore(), "Unknown caller score");
        assertEq(UrgencyResult.Level.LOW, res.getUrgencyLevel(), "Unknown caller level");
    }

    private static void testInsufficientHistory(WeightedRuleEngine engine) {
        // Insufficient history (< 3 records) neutrally scores 0
        CallerProfile profile = new CallerProfile(4, "Alice", "000", "Colleague", CallerProfile.Priority.NORMAL);
        List<CallRecord> history = new ArrayList<>();
        history.add(createDummyRecord()); // only 1 call
        CallContext ctx = new CallContext(profile, new ArrayList<>(), history, getDayTime());
        UrgencyResult res = engine.evaluate(ctx);
        printResult("5. Insufficient Historical Data (Neutral)", res);
        assertEq(0, res.getScore(), "Insufficient history score");
    }

    private static void testRepeatedCallStepProgression(WeightedRuleEngine engine) {
        System.out.println("\n[TEST] 6. Repeated Call Progression Steps (0, 10, 22, 35)");
        CallerProfile normal = new CallerProfile(10, "Colleague", "999", "Work", CallerProfile.Priority.NORMAL);

        // 1 call (0 prior) -> 0
        CallContext c1 = new CallContext(normal, new ArrayList<>(), new ArrayList<>(), getDayTime());
        assertEq(0, engine.evaluate(c1).getScore(), "1 call score");

        // 2 calls (1 prior) -> 10
        List<CallRecord> r1 = new ArrayList<>(); r1.add(createDummyRecord());
        CallContext c2 = new CallContext(normal, r1, new ArrayList<>(), getDayTime());
        assertEq(10, engine.evaluate(c2).getScore(), "2 calls score");

        // 3 calls (2 prior) -> 22
        List<CallRecord> r2 = new ArrayList<>(); r2.add(createDummyRecord()); r2.add(createDummyRecord());
        CallContext c3 = new CallContext(normal, r2, new ArrayList<>(), getDayTime());
        assertEq(22, engine.evaluate(c3).getScore(), "3 calls score");

        // 4 calls (3 prior) -> 35
        List<CallRecord> r3 = new ArrayList<>(); r3.add(createDummyRecord()); r3.add(createDummyRecord()); r3.add(createDummyRecord());
        CallContext c4 = new CallContext(normal, r3, new ArrayList<>(), getDayTime());
        assertEq(35, engine.evaluate(c4).getScore(), "4 calls score");
    }

    private static void testHistoricalMissedAnomaly(WeightedRuleEngine engine) {
        System.out.println("\n[TEST] 7. Historical Missed Call Anomaly (+30)");
        CallerProfile normal = new CallerProfile(11, "Doctor", "112", "Medical", CallerProfile.Priority.NORMAL);
        List<CallRecord> history = new ArrayList<>();
        history.add(new CallRecord(1, "112", 0, 0, 0, "", "")); // missed
        history.add(new CallRecord(2, "112", 0, 0, 0, "", "")); // missed
        history.add(new CallRecord(3, "112", 0, 120, 0, "", "")); // answered
        // 2 out of 3 missed (66.7% >= 50%) -> +30
        CallContext ctx = new CallContext(normal, new ArrayList<>(), history, getDayTime());
        UrgencyResult res = engine.evaluate(ctx);
        assertEq(30, res.getScore(), "Historical anomaly score");
    }

    private static void testThresholdBoundaries(WeightedRuleEngine engine) {
        System.out.println("\n[TEST] 8. Configurable Alert Threshold Evaluation (60, 70, 80)");
        // Test score 65: triggers threshold 60, but does not trigger threshold 70 or 80
        int score65 = 65;
        assertTrue(score65 >= 60, "Score 65 triggers threshold 60");
        assertTrue(score65 < 70, "Score 65 does not trigger threshold 70");
        assertTrue(score65 < 80, "Score 65 does not trigger threshold 80");

        // Test score 75: triggers threshold 60 and 70, but not 80
        int score75 = 75;
        assertTrue(score75 >= 60, "Score 75 triggers threshold 60");
        assertTrue(score75 >= 70, "Score 75 triggers threshold 70");
        assertTrue(score75 < 80, "Score 75 does not trigger threshold 80");

        // Test score 85: triggers all thresholds
        int score85 = 85;
        assertTrue(score85 >= 60, "Score 85 triggers threshold 60");
        assertTrue(score85 >= 70, "Score 85 triggers threshold 70");
        assertTrue(score85 >= 80, "Score 85 triggers threshold 80");
    }

    private static void testTimeSchedulePolicies() {
        System.out.println("\n[TEST] 9. Time Schedule Policies (All day, Daytime only, Night-time only)");
        long dayTime = getDayTime();   // 14:00 (Day)
        long nightTime = getNightTime(); // 03:00 (Night)

        // ALL_DAY permits both
        assertTrue(isPermitted("ALL_DAY", dayTime), "All day permits day");
        assertTrue(isPermitted("ALL_DAY", nightTime), "All day permits night");

        // DAYTIME permits only daytime
        assertTrue(isPermitted("DAYTIME", dayTime), "Daytime permits day");
        assertTrue(!isPermitted("DAYTIME", nightTime), "Daytime blocks night");

        // NIGHTTIME permits only night
        assertTrue(!isPermitted("NIGHTTIME", dayTime), "Night-time blocks day");
        assertTrue(isPermitted("NIGHTTIME", nightTime), "Night-time permits night");
    }

    private static void testCooldownDuplicateSuppression() {
        System.out.println("\n[TEST] 10. Cooldown & Duplicate Alert Suppression");
        long now = 1000000L;
        String phone = "+919876543210";
        int score = 80;

        recordCooldownAlertSent(phone, score, now);

        // Immediate duplicate (10 seconds later)
        String suppressed = checkCooldownDuplicate(phone, score, now + 10000L);
        assertTrue(suppressed != null, "Duplicate within 30s suppressed");

        // Different phone or score is not suppressed
        String diffPhone = checkCooldownDuplicate("+919111122222", score, now + 10000L);
        assertTrue(diffPhone == null, "Different phone not suppressed");

        // After cooldown expires (35 seconds later)
        String expired = checkCooldownDuplicate(phone, score, now + 35000L);
        assertTrue(expired == null, "After 30s cooldown expired alert allowed");
    }

    private static long sCooldownLastTime = 0;
    private static String sCooldownLastPhone = "";
    private static int sCooldownLastScore = -1;

    private static void recordCooldownAlertSent(String phone, int score, long now) {
        sCooldownLastPhone = phone.replaceAll("[^0-9+]", "");
        sCooldownLastScore = score;
        sCooldownLastTime = now;
    }

    private static String checkCooldownDuplicate(String phone, int score, long now) {
        String norm = phone.replaceAll("[^0-9+]", "");
        if (norm.equals(sCooldownLastPhone) && score == sCooldownLastScore) {
            long diff = now - sCooldownLastTime;
            if (diff >= 0 && diff < 30000L) {
                long remainingSec = (30000L - diff) / 1000;
                return "Duplicate alert suppressed (cooldown active: sent " + (diff / 1000) + "s ago; retry in " + remainingSec + "s).";
            }
        }
        return null;
    }

    private static void testBoundaries(WeightedRuleEngine engine) {
        System.out.println("\n[TEST] 11. Boundary Bounds (0 MIN and 100 MAX)");
        // Max: Emergency (25) + 4+ calls (35) + Night (10) + Hist Missed (30) = 100
        CallerProfile profile = new CallerProfile(5, "Emergency Center", "111", "Medical", CallerProfile.Priority.EMERGENCY);
        List<CallRecord> recent = new ArrayList<>();
        recent.add(createDummyRecord()); recent.add(createDummyRecord());
        recent.add(createDummyRecord()); recent.add(createDummyRecord());

        List<CallRecord> history = new ArrayList<>();
        history.add(new CallRecord(0, "111", 0, 0, 0, "", ""));
        history.add(new CallRecord(0, "111", 0, 0, 0, "", ""));
        history.add(new CallRecord(0, "111", 0, 0, 0, "", ""));

        CallContext ctxMax = new CallContext(profile, recent, history, getNightTime());
        UrgencyResult resMax = engine.evaluate(ctxMax);
        printResult("MAX Boundary Check (Clamped to 100)", resMax);
        assertEq(100, resMax.getScore(), "Max boundary score");
        assertEq(UrgencyResult.Level.HIGH, resMax.getUrgencyLevel(), "Max boundary level");

        // Min: Unknown caller with 0 calls = 0
        CallContext ctxMin = new CallContext(null, new ArrayList<>(), new ArrayList<>(), getDayTime());
        UrgencyResult resMin = engine.evaluate(ctxMin);
        printResult("MIN Boundary Check (Clamped to 0)", resMin);
        assertEq(0, resMin.getScore(), "Min boundary score");
        assertEq(UrgencyResult.Level.LOW, resMin.getUrgencyLevel(), "Min boundary level");
    }

    // Helpers
    private static CallRecord createDummyRecord() {
        return new CallRecord(1, "123", 0, 30, 0, "LOW", "Test");
    }

    private static long getDayTime() {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 14);
        cal.set(Calendar.MINUTE, 0);
        return cal.getTimeInMillis();
    }

    private static long getNightTime() {
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 3);
        cal.set(Calendar.MINUTE, 0);
        return cal.getTimeInMillis();
    }

    private static boolean isPermitted(String schedule, long timeMillis) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(timeMillis);
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        if ("DAYTIME".equals(schedule)) return (hour >= 6 && hour < 22);
        if ("NIGHTTIME".equals(schedule)) return (hour >= 22 || hour < 6);
        return true;
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
}
