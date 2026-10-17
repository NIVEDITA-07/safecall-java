package com.safecall.model;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents the state of an active non-response monitoring sequence.
 *
 * A sequence begins when the first missed/unknown incoming call is detected.
 * It accumulates until:
 *   - A response event (ANSWERED, DECLINED, OUTGOING_CALLBACK) resets it.
 *   - The 15-minute rolling window expires without new calls.
 *   - The sequence transitions through GRACE_PERIOD → DISPATCHED.
 *
 * Persisted to the `non_response_sequences` SQLite table so it survives app restart
 * and process death during a critical monitoring period.
 */
public class PendingSequence {

    // Status constants — stored as TEXT in SQLite
    public static final String STATUS_ACCUMULATING = "ACCUMULATING";
    public static final String STATUS_GRACE_PERIOD = "GRACE_PERIOD";
    public static final String STATUS_DISPATCHED   = "DISPATCHED";
    public static final String STATUS_CANCELLED    = "CANCELLED";
    public static final String STATUS_RESOLVED     = "RESOLVED";

    /** DB row id. 0 when not yet persisted. */
    public long dbId;

    /** Unique identifier for this sequence. Format: "seq_<firstMissedAt>" */
    public String sequenceId;

    /** Epoch ms of the FIRST missed call in this sequence. Used for persistence timing. */
    public long firstMissedAt;

    /** Count of consecutive missed/unknown calls in the rolling window. */
    public int missedCount;

    /** Unique phone numbers of all callers in this sequence (deduped). */
    public List<String> distinctCallers;

    /** Epoch ms when the grace period started. 0 if not yet started. */
    public long gracePeriodStartAt;

    public String status;
    public long lastUpdated;

    public PendingSequence() {
        this.distinctCallers = new ArrayList<>();
        this.status = STATUS_ACCUMULATING;
        this.missedCount = 0;
        this.gracePeriodStartAt = 0;
    }

    /** Returns the number of unique callers in this sequence. */
    public int getDistinctCallerCount() {
        return distinctCallers.size();
    }

    /** Adds a caller if not already present. Normalises to last 10 digits for matching. */
    public void addCaller(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        String clean = phoneNumber.replaceAll("[^0-9]", "");
        String key = clean.length() >= 10 ? clean.substring(clean.length() - 10) : clean;
        if (key.isEmpty()) return;

        for (String existing : distinctCallers) {
            String existClean = existing.replaceAll("[^0-9]", "");
            String existKey = existClean.length() >= 10 ? existClean.substring(existClean.length() - 10) : existClean;
            if (existKey.equals(key)) return;
        }
        distinctCallers.add(phoneNumber.trim());
    }

    /** Returns the primary (first) caller phone number, or "Unknown" if none recorded. */
    public String getPrimaryCallerPhone() {
        return distinctCallers.isEmpty() ? "Unknown" : distinctCallers.get(0);
    }

    /** Serialises distinctCallers to a JSON array string for SQLite storage. */
    public String getDistinctCallersJson() {
        JSONArray arr = new JSONArray();
        for (String c : distinctCallers) arr.put(c);
        return arr.toString();
    }

    /** Deserialises distinctCallers from a JSON array string. */
    public void setDistinctCallersFromJson(String json) {
        distinctCallers = new ArrayList<>();
        if (json == null || json.trim().isEmpty()) return;
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                distinctCallers.add(arr.getString(i));
            }
        } catch (JSONException e) {
            // Leave empty — cannot parse stored callers
        }
    }

    public boolean isActive() {
        return STATUS_ACCUMULATING.equals(status) || STATUS_GRACE_PERIOD.equals(status);
    }

    @Override
    public String toString() {
        return "PendingSequence{id=" + sequenceId + ", missed=" + missedCount
                + ", callers=" + distinctCallers.size() + ", status=" + status + "}";
    }
}
