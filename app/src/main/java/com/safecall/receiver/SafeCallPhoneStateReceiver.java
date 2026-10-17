package com.safecall.receiver;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.os.Build;
import android.provider.CallLog;
import android.telephony.TelephonyManager;
import android.util.Log;

import com.safecall.engine.CallEventProcessor;
import com.safecall.model.CallOutcome;

public class SafeCallPhoneStateReceiver extends BroadcastReceiver {

    private static final String TAG = "SafeCallReceiver";

    // Internal State Machine tracking across broadcasts
    private static int lastState = TelephonyManager.CALL_STATE_IDLE;
    private static long ringStartTime = 0;
    private static long callAnsweredTime = 0;
    private static boolean isIncoming = false;
    private static String savedNumber = "";
    private static long lastProcessedTimestamp = 0;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String action = intent.getAction();
        if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(action)) {
            return;
        }

        String stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        String number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);

        if (number != null && !number.trim().isEmpty()) {
            savedNumber = number.trim();
        }

        int state = TelephonyManager.CALL_STATE_IDLE;
        if (TelephonyManager.EXTRA_STATE_RINGING.equals(stateStr)) {
            state = TelephonyManager.CALL_STATE_RINGING;
        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(stateStr)) {
            state = TelephonyManager.CALL_STATE_OFFHOOK;
        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(stateStr)) {
            state = TelephonyManager.CALL_STATE_IDLE;
        }

        final PendingResult pendingResult = goAsync();
        onCallStateChanged(context, state, savedNumber, pendingResult);
    }

    public synchronized void onCallStateChanged(Context context, int state, String number, final PendingResult pendingResult) {
        if (lastState == state) {
            if (pendingResult != null) {
                try { pendingResult.finish(); } catch (Exception ignored) {}
            }
            return;
        }

        long now = System.currentTimeMillis();

        switch (state) {
            case TelephonyManager.CALL_STATE_RINGING:
                isIncoming = true;
                ringStartTime = now;
                if (number != null && !number.isEmpty()) {
                    savedNumber = number;
                }
                Log.d(TAG, "Call State: RINGING from " + (savedNumber.isEmpty() ? "UNKNOWN" : savedNumber));
                if (pendingResult != null) {
                    try { pendingResult.finish(); } catch (Exception ignored) {}
                }
                break;

            case TelephonyManager.CALL_STATE_OFFHOOK:
                if (lastState == TelephonyManager.CALL_STATE_RINGING) {
                    // Incoming call picked up / answered
                    isIncoming = true;
                    callAnsweredTime = now;
                    Log.d(TAG, "Call State: OFFHOOK (Incoming Answered) from " + savedNumber);
                } else {
                    // Outgoing call started
                    isIncoming = false;
                    callAnsweredTime = now;
                    Log.d(TAG, "Call State: OFFHOOK (Outgoing call initiated)");
                }
                if (pendingResult != null) {
                    try { pendingResult.finish(); } catch (Exception ignored) {}
                }
                break;

            case TelephonyManager.CALL_STATE_IDLE:
                Log.d(TAG, "Call State: IDLE. Previous state: " + lastState + ", wasIncoming: " + isIncoming);

                // Debounce duplicate broadcasts (dual-SIM or repeated idle broadcasts)
                if (now - lastProcessedTimestamp < 2500) {
                    Log.d(TAG, "Suppressing duplicate IDLE state broadcast within debounce window.");
                    lastState = state;
                    if (pendingResult != null) {
                        try { pendingResult.finish(); } catch (Exception ignored) {}
                    }
                    return;
                }

                if (lastState == TelephonyManager.CALL_STATE_RINGING) {
                    // Missed / Rejected Call (never answered)
                    lastProcessedTimestamp = now;
                    handleCallFinished(context, savedNumber, ringStartTime > 0 ? ringStartTime : now, 0, CallOutcome.MISSED, pendingResult);

                } else if (isIncoming && lastState == TelephonyManager.CALL_STATE_OFFHOOK) {
                    // Answered Incoming Call Ended
                    lastProcessedTimestamp = now;
                    int duration = (int) Math.max(1, (now - callAnsweredTime) / 1000);
                    handleCallFinished(context, savedNumber, ringStartTime > 0 ? ringStartTime : callAnsweredTime, duration, CallOutcome.ANSWERED, pendingResult);
                } else if (!isIncoming && lastState == TelephonyManager.CALL_STATE_OFFHOOK) {
                    // Outgoing Call Ended (Senior called out)
                    lastProcessedTimestamp = now;
                    int duration = (int) Math.max(1, (now - callAnsweredTime) / 1000);
                    handleCallFinished(context, savedNumber, callAnsweredTime, duration, CallOutcome.OUTGOING_CALLBACK, pendingResult);
                } else {
                    if (pendingResult != null) {
                        try { pendingResult.finish(); } catch (Exception ignored) {}
                    }
                }

                // Reset state machine
                ringStartTime = 0;
                callAnsweredTime = 0;
                isIncoming = false;
                savedNumber = "";
                break;
        }

        lastState = state;
    }

    private void handleCallFinished(Context context, String reportedNumber, long callStartTime, int trackedDuration, CallOutcome initialOutcome, final PendingResult pendingResult) {
        final Context appContext = context.getApplicationContext();
        final String initialNumber = (reportedNumber != null && !reportedNumber.trim().isEmpty()) ? reportedNumber.trim() : "";
        final long startTime = callStartTime;
        final int duration = trackedDuration;
        final CallOutcome defaultOutcome = initialOutcome;

        // Use Android Handler to delay query by 1200ms, giving the system Dialer service time to commit the CallLog row
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            CallEventProcessor.EXECUTOR.execute(() -> {
                try {
                    String finalNumber = initialNumber;
                    int finalDuration = duration;
                    CallOutcome finalOutcome = defaultOutcome;

                    // Inspect CallLog after the dialer has committed
                    CallLogInfo logInfo = inspectLatestCallLog(appContext);
                    if (logInfo != null) {
                        if ((finalNumber.isEmpty() || "UNKNOWN".equalsIgnoreCase(finalNumber)) && logInfo.number != null && !logInfo.number.isEmpty()) {
                            finalNumber = logInfo.number;
                        }
                        if (logInfo.outcome != null && logInfo.outcome != CallOutcome.UNKNOWN) {
                            finalOutcome = logInfo.outcome;
                        }
                        if (finalOutcome == CallOutcome.ANSWERED && logInfo.durationSeconds > 0) {
                            finalDuration = logInfo.durationSeconds;
                        } else if (finalOutcome == CallOutcome.MISSED || finalOutcome == CallOutcome.DECLINED) {
                            finalDuration = 0;
                        }
                    }

                    if (finalNumber.isEmpty() || "UNKNOWN".equalsIgnoreCase(finalNumber)) {
                        finalNumber = "Incoming Real Call";
                    }

                    Log.i(TAG, "Dispatching finished real call to engine: Number=" + finalNumber +
                            ", Duration=" + finalDuration + "s, Outcome=" + finalOutcome);

                    CallEventProcessor.processCallEvent(appContext, finalNumber, startTime, finalDuration, finalOutcome);
                } catch (Exception e) {
                    Log.e(TAG, "Error processing finished call: " + e.getMessage(), e);
                } finally {
                    if (pendingResult != null) {
                        try { pendingResult.finish(); } catch (Exception ignored) {}
                    }
                }
            });
        }, 1200);
    }

    private static class CallLogInfo {
        String number;
        int durationSeconds;
        CallOutcome outcome;
    }

    private CallLogInfo inspectLatestCallLog(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (context.checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
                return null;
            }
        }

        Cursor cursor = null;
        try {
            cursor = context.getContentResolver().query(
                    CallLog.Calls.CONTENT_URI,
                    new String[]{CallLog.Calls.NUMBER, CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.TYPE},
                    null,
                    null,
                    CallLog.Calls.DATE + " DESC"
            );

            if (cursor != null && cursor.moveToFirst()) {
                long callDate = cursor.getLong(cursor.getColumnIndexOrThrow(CallLog.Calls.DATE));
                // Consider call log if recorded within the last 5 minutes (300,000 ms)
                if (System.currentTimeMillis() - callDate < 300000) {
                    CallLogInfo info = new CallLogInfo();
                    info.number = cursor.getString(cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER));
                    info.durationSeconds = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION));
                    int type = cursor.getInt(cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE));

                    if (type == CallLog.Calls.REJECTED_TYPE) {
                        info.outcome = CallOutcome.DECLINED;
                        info.durationSeconds = 0;
                    } else if (type == CallLog.Calls.MISSED_TYPE) {
                        info.outcome = CallOutcome.MISSED;
                        info.durationSeconds = 0;
                    } else if (type == CallLog.Calls.OUTGOING_TYPE) {
                        info.outcome = CallOutcome.OUTGOING_CALLBACK;
                    } else if (type == CallLog.Calls.INCOMING_TYPE) {
                        info.outcome = (info.durationSeconds > 0) ? CallOutcome.ANSWERED : CallOutcome.UNKNOWN;
                    } else {
                        info.outcome = (info.durationSeconds > 0) ? CallOutcome.ANSWERED : CallOutcome.UNKNOWN;
                    }

                    return info;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "CallLog query error: " + e.getMessage());
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return null;
    }
}
