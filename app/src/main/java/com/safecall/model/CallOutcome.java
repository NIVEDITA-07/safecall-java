package com.safecall.model;

/**
 * Represents the deterministic outcome of a completed call event.
 *
 * Android CallLog.Calls provides TYPE to distinguish outcomes. We map those to this
 * enum, using UNKNOWN when the OS does not provide reliable evidence.
 *
 * IMPORTANT: Do NOT infer MISSED from a short duration alone.
 * Do NOT infer DECLINED unless CallLog.Calls.REJECTED_TYPE is explicitly returned.
 */
public enum CallOutcome {

    /** Incoming call was answered; durationSeconds > 0 */
    ANSWERED,

    /** Incoming call was never answered — CallLog.Calls.MISSED_TYPE */
    MISSED,

    /**
     * Incoming call was explicitly rejected by the recipient.
     * Only use when CallLog.Calls.REJECTED_TYPE is returned.
     * An answered call of 0 seconds must NOT be classified as DECLINED.
     */
    DECLINED,

    /**
     * An outgoing call placed by the elderly person, possibly a callback.
     * CallLog.Calls.OUTGOING_TYPE. Does NOT close an answered-incoming sequence.
     * It does close a missed-call monitoring sequence (person is active).
     */
    OUTGOING_CALLBACK,

    /**
     * Cannot reliably determine the outcome. Treated like MISSED for sequence
     * accumulation but does not increase the DECLINED path.
     * Use when CallLog permission is denied, or type is unrecognized.
     */
    UNKNOWN
}
