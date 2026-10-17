package com.safecall.engine;

import com.safecall.model.CallOutcome;
import com.safecall.model.CallRecord;
import com.safecall.model.RoutineBaseline;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * RoutineAnalyzer learns and computes the elderly person's personalized baseline
 * from historical non-simulation call records.
 *
 * Rules:
 * - Requires at least 10 observations in an hour bucket before forming a baseline.
 * - Never includes records tagged with isSimulation=true.
 * - Respects answered vs missed outcomes to calculate normal answer rate.
 */
public class RoutineAnalyzer {

    public static final int MIN_ROUTINE_OBSERVATIONS = 10;

    /**
     * Computes the answer rate baseline for the specified hour-of-day (0–23).
     */
    public static RoutineBaseline analyzeHourBucket(List<CallRecord> history, int hourOfDay) {
        String bucketKey = "hour_" + (hourOfDay < 10 ? "0" + hourOfDay : hourOfDay);
        if (history == null || history.isEmpty()) {
            return RoutineBaseline.neutral(bucketKey, 0);
        }

        int totalObservations = 0;
        int answeredCount = 0;

        Calendar cal = Calendar.getInstance();
        for (CallRecord record : history) {
            // Strictly exclude simulated calls from baseline calculation
            if (record.isSimulation() || record.getTimestamp() <= 0) {
                continue;
            }

            cal.setTimeInMillis(record.getTimestamp());
            int recHour = cal.get(Calendar.HOUR_OF_DAY);
            if (recHour == hourOfDay) {
                totalObservations++;
                if (record.getCallOutcome() == CallOutcome.ANSWERED || record.getDurationSeconds() > 0) {
                    answeredCount++;
                }
            }
        }

        if (totalObservations < MIN_ROUTINE_OBSERVATIONS) {
            return RoutineBaseline.neutral(bucketKey, totalObservations);
        }

        float answerRate = (float) answeredCount / totalObservations;
        return new RoutineBaseline(true, answerRate, totalObservations, bucketKey);
    }

    /**
     * Finds the maximum run of consecutive missed calls in historical records.
     * Used for Component E (Historical Response Deviation).
     */
    public static int calculateMaxConsecutiveMissed(List<CallRecord> history) {
        if (history == null || history.size() < MIN_ROUTINE_OBSERVATIONS) {
            return 0;
        }

        // Filter non-simulation records with valid timestamps
        List<CallRecord> realRecords = new ArrayList<>();
        for (CallRecord r : history) {
            if (!r.isSimulation() && r.getTimestamp() > 0) {
                realRecords.add(r);
            }
        }

        if (realRecords.size() < MIN_ROUTINE_OBSERVATIONS) {
            return 0;
        }

        // Sort chronologically ascending
        Collections.sort(realRecords, Comparator.comparingLong(CallRecord::getTimestamp));

        int maxConsecutive = 0;
        int currentRun = 0;

        for (CallRecord r : realRecords) {
            boolean isMissed = (r.getCallOutcome() == CallOutcome.MISSED ||
                    (r.getDurationSeconds() == 0 && r.getCallOutcome() != CallOutcome.DECLINED &&
                            r.getCallOutcome() != CallOutcome.ANSWERED &&
                            r.getCallOutcome() != CallOutcome.OUTGOING_CALLBACK));

            if (isMissed) {
                currentRun++;
                if (currentRun > maxConsecutive) {
                    maxConsecutive = currentRun;
                }
            } else {
                currentRun = 0;
            }
        }

        return maxConsecutive;
    }
}
