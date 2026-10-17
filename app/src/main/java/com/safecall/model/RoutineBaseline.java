package com.safecall.model;

/**
 * Holds the result of a routine baseline analysis for a specific hour-of-day bucket.
 *
 * Requires at least MIN_ROUTINE_OBSERVATIONS (10) records in the bucket before
 * sufficientData is true. Below that threshold, the baseline is NEUTRAL (sufficientData=false)
 * and must not be used to fabricate statistics.
 *
 * normalAnswerRate ∈ [0.0, 1.0]
 *   0.0 = person never answers in this hour (calls are expected to be missed)
 *   1.0 = person always answers in this hour (a miss is highly anomalous)
 *
 * Example: hourBucket = "hour_15" means the 15:00–15:59 window.
 */
public class RoutineBaseline {

    public final boolean sufficientData;
    public final float normalAnswerRate;
    public final int observationCount;
    public final String hourBucket;

    public RoutineBaseline(boolean sufficientData, float normalAnswerRate,
                           int observationCount, String hourBucket) {
        this.sufficientData = sufficientData;
        this.normalAnswerRate = Math.max(0f, Math.min(1f, normalAnswerRate));
        this.observationCount = observationCount;
        this.hourBucket = hourBucket;
    }

    /**
     * A neutral baseline — used when there are fewer than MIN_ROUTINE_OBSERVATIONS records.
     * Component B contributes 0 points when neutral.
     */
    public static RoutineBaseline neutral(String hourBucket, int observationCount) {
        return new RoutineBaseline(false, 0f, observationCount, hourBucket);
    }

    @Override
    public String toString() {
        if (!sufficientData) {
            return "Neutral baseline (only " + observationCount + " observations in " + hourBucket + ")";
        }
        return String.format("Baseline for %s: %.0f%% answer rate (%d obs)",
                hourBucket, normalAnswerRate * 100, observationCount);
    }
}
