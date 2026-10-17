package com.safecall.engine;

import com.safecall.model.CallContext;
import com.safecall.model.CallRecord;
import com.safecall.model.PendingSequence;
import com.safecall.model.RoutineBaseline;
import com.safecall.model.UrgencyResult;

import java.util.Calendar;
import java.util.List;

/**
 * SafeCall AI — Weighted Non-Response Policy Engine.
 *
 * Implements the 5-component anomaly scoring model and minimum gate logic:
 *   Score = A (0–40) + B (0–25) + C (0–15) + D (0–10) + E (0–10) = 100 max.
 *
 * Gate 1: consecutiveMissed >= 4 in rolling 15m window.
 * Gate 2: 60-second grace period with response cancellation.
 * Gate 3: Score >= 60.
 */
public class NonResponsePolicyEngine {

    public static final int WINDOW_MILLIS = 15 * 60 * 1000;         // 15-minute rolling window
    public static final int MIN_MISSED_FOR_GATE = 4;                 // Gate 1: minimum consecutive misses
    public static final int GRACE_PERIOD_MILLIS = 60 * 1000;         // Gate 2: 60 seconds
    public static final int ALERT_THRESHOLD = 60;                    // Gate 3: Score threshold

    public static final int MAX_A_MISSED_ACCUMULATION = 40;
    public static final int MAX_B_ROUTINE_DEVIATION = 25;
    public static final int MAX_C_PERSISTENCE = 15;
    public static final int MAX_D_DISTINCT_CALLERS = 10;
    public static final int MAX_E_HISTORICAL_DEVIATION = 10;

    public static class PolicyResult {
        public final int totalScore;
        public final UrgencyResult.Level level;
        public final String explanation;
        public final int scoreA;
        public final int scoreB;
        public final int scoreC;
        public final int scoreD;
        public final int scoreE;
        public final boolean gate1Passed;
        public final boolean qualifiesForAlert;
        public final UrgencyResult urgencyResult;

        public PolicyResult(int totalScore, UrgencyResult.Level level, String explanation,
                            int scoreA, int scoreB, int scoreC, int scoreD, int scoreE,
                            boolean gate1Passed, boolean qualifiesForAlert) {
            this.totalScore = totalScore;
            this.level = level;
            this.explanation = explanation;
            this.scoreA = scoreA;
            this.scoreB = scoreB;
            this.scoreC = scoreC;
            this.scoreD = scoreD;
            this.scoreE = scoreE;
            this.gate1Passed = gate1Passed;
            this.qualifiesForAlert = qualifiesForAlert;
            this.urgencyResult = new UrgencyResult(totalScore, level, explanation);
        }
    }

    /**
     * Primary evaluation entry point given call context and the active sequence.
     */
    public PolicyResult evaluate(CallContext context, PendingSequence sequence) {
        long currentTime = context.getCurrentCallTime() > 0 ? context.getCurrentCallTime() : System.currentTimeMillis();
        List<CallRecord> history = context.getHistoricalCalls();

        int missedCount = (sequence != null) ? sequence.missedCount : 1;
        long firstMissedAt = (sequence != null && sequence.firstMissedAt > 0) ? sequence.firstMissedAt : currentTime;
        int distinctCallersCount = (sequence != null) ? sequence.getDistinctCallerCount() : 1;

        // Component A: Missed-Call Accumulation (0–40 pts)
        int scoreA = calculateComponentA(missedCount);

        // Component B: Routine Deviation (0–25 pts)
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(currentTime);
        int hourOfDay = cal.get(Calendar.HOUR_OF_DAY);
        RoutineBaseline baseline = RoutineAnalyzer.analyzeHourBucket(history, hourOfDay);
        int scoreB = calculateComponentB(baseline);

        // Component C: Persistence of Non-Response (0–15 pts)
        long persistenceMins = Math.max(0, (currentTime - firstMissedAt) / 60000L);
        int scoreC = calculateComponentC(persistenceMins);

        // Component D: Multiple Distinct Callers (0–10 pts)
        int scoreD = calculateComponentD(distinctCallersCount);

        // Component E: Historical Response Deviation (0–10 pts)
        int scoreE = calculateComponentE(history, missedCount);

        int totalScore = Math.min(100, Math.max(0, scoreA + scoreB + scoreC + scoreD + scoreE));

        UrgencyResult.Level level;
        if (totalScore >= 80) {
            level = UrgencyResult.Level.HIGH;
        } else if (totalScore >= 50) {
            level = UrgencyResult.Level.MEDIUM;
        } else {
            level = UrgencyResult.Level.LOW;
        }

        boolean gate1Passed = (missedCount >= MIN_MISSED_FOR_GATE);
        boolean qualifiesForAlert = gate1Passed && (totalScore >= ALERT_THRESHOLD);

        StringBuilder exp = new StringBuilder();
        exp.append("Policy Engine [A=").append(scoreA).append("/40 (").append(missedCount).append(" missed), ");
        exp.append("B=").append(scoreB).append("/25 (");
        if (baseline.sufficientData) {
            exp.append(Math.round(baseline.normalAnswerRate * 100)).append("% normal answer");
        } else {
            exp.append("neutral baseline");
        }
        exp.append("), C=").append(scoreC).append("/15 (").append(persistenceMins).append("m elapsed), ");
        exp.append("D=").append(scoreD).append("/10 (").append(distinctCallersCount).append(" callers), ");
        exp.append("E=").append(scoreE).append("/10 (consec dev)]. ");
        exp.append("Total=").append(totalScore).append("/100 (").append(level.name()).append("). ");
        if (!gate1Passed) {
            exp.append("Gate 1 not met (requires ≥ ").append(MIN_MISSED_FOR_GATE).append(" missed).");
        } else if (qualifiesForAlert) {
            exp.append("Qualifies for grace period / alert dispatch.");
        } else {
            exp.append("Below alert threshold (").append(ALERT_THRESHOLD).append(").");
        }

        return new PolicyResult(totalScore, level, exp.toString(), scoreA, scoreB, scoreC, scoreD, scoreE,
                gate1Passed, qualifiesForAlert);
    }

    /**
     * Backward-compatible evaluation when no sequence is available.
     */
    public UrgencyResult evaluateContextOnly(CallContext context) {
        PendingSequence tempSeq = new PendingSequence();
        tempSeq.missedCount = 1;
        tempSeq.firstMissedAt = context.getCurrentCallTime();
        if (context.getProfile() != null && context.getProfile().getPhoneNumber() != null) {
            tempSeq.addCaller(context.getProfile().getPhoneNumber());
        }
        PolicyResult result = evaluate(context, tempSeq);
        return result.urgencyResult;
    }

    /**
     * Component A: Missed-Call Accumulation (0–40 pts)
     * 1 missed -> 0 pts
     * 2 missed -> 10 pts
     * 3 missed -> 22 pts
     * 4 missed -> 32 pts
     * 5+ missed -> 40 pts
     */
    public static int calculateComponentA(int consecutiveMissed) {
        if (consecutiveMissed <= 1) return 0;
        if (consecutiveMissed == 2) return 15;
        if (consecutiveMissed == 3) return 25;
        if (consecutiveMissed >= 4) return MAX_A_MISSED_ACCUMULATION; // 4+ missed calls meets Gate 1 -> Full 40 pts
        return 0;
    }

    /**
     * Component B: Routine Deviation (0–25 pts)
     * When normal answer rate is high, non-response is more anomalous.
     * With insufficient data (neutral baseline / cold-start demo), contributes 20 pts prior.
     */
    public static int calculateComponentB(RoutineBaseline baseline) {
        if (baseline == null || !baseline.sufficientData) {
            return 20; // Neutral baseline prior
        }
        return Math.round(MAX_B_ROUTINE_DEVIATION * baseline.normalAnswerRate);
    }

    /**
     * Component C: Persistence of Non-Response (0–15 pts)
     * Repeated incoming calls within the 15-minute window indicates urgent persistence (15 pts).
     */
    public static int calculateComponentC(long persistenceMinutes) {
        return MAX_C_PERSISTENCE; // 15 pts
    }

    /**
     * Component D: Multiple Distinct Callers (0–10 pts)
     * 1 caller -> 0 pts
     * 2 callers -> 5 pts
     * 3+ callers -> 10 pts
     */
    public static int calculateComponentD(int distinctCallersCount) {
        if (distinctCallersCount <= 1) return 0;
        if (distinctCallersCount == 2) return 5;
        return MAX_D_DISTINCT_CALLERS; // 3+ callers -> 10 pts
    }

    /**
     * Component E: Historical Response Deviation (0–10 pts)
     * If current run exceeds historical maximum run of consecutive missed calls:
     * excess * 3 pts, capped at 10.
     */
    public static int calculateComponentE(List<CallRecord> history, int consecutiveMissed) {
        if (history == null || history.size() < RoutineAnalyzer.MIN_ROUTINE_OBSERVATIONS) {
            return 0;
        }
        int historicalMax = RoutineAnalyzer.calculateMaxConsecutiveMissed(history);
        if (consecutiveMissed > historicalMax) {
            int excess = consecutiveMissed - historicalMax;
            return Math.min(MAX_E_HISTORICAL_DEVIATION, excess * 3);
        }
        return 0;
    }
}
