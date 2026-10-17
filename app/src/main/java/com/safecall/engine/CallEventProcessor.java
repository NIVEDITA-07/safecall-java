package com.safecall.engine;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.safecall.db.CallRepository;
import com.safecall.model.CallOutcome;
import com.safecall.model.CallerProfile;
import com.safecall.model.UrgencyResult;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * CallEventProcessor coordinates telephony events, routing real phone calls through
 * SequenceTracker for multi-gate non-response evaluation.
 */
public class CallEventProcessor {

    private static final String TAG = "CallEventProcessor";
    public static final String PREFS_NAME = "safecall_prefs";
    public static final String KEY_SERVER_URL = "safecall_server_url";
    public static final String KEY_AUTH_TOKEN = "safecall_token";
    public static final String KEY_USER_ROLE = "safecall_role";
    public static final String KEY_USER_ID = "safecall_user_id";
    public static final String KEY_USER_NAME = "safecall_user_name";

    public static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    /**
     * Primary entry point for finished telephony call events with explicit CallOutcome.
     */
    public static void processCallEvent(
            Context context,
            String incomingNumber,
            long callStartTime,
            int durationSeconds,
            CallOutcome outcome
    ) {
        if (context == null) return;
        final Context appContext = context.getApplicationContext();

        EXECUTOR.execute(() -> {
            try {
                Log.i(TAG, "Routing real telephony event to SequenceTracker: " + incomingNumber +
                        ", Duration=" + durationSeconds + "s, Outcome=" + outcome);

                SequenceTracker.getInstance().onCallEvent(
                        appContext,
                        incomingNumber,
                        callStartTime,
                        durationSeconds,
                        outcome
                );

                // Drain any prior offline alerts if network is reachable
                drainOfflineAlertsInternal(appContext, new CallRepository(appContext));
            } catch (Exception e) {
                Log.e(TAG, "Error in processCallEvent: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Backward-compatible overload for legacy callers.
     */
    public static void processCallEvent(
            Context context,
            String incomingNumber,
            long callStartTime,
            int durationSeconds,
            boolean isMissed
    ) {
        CallOutcome outcome;
        if (isMissed) {
            outcome = CallOutcome.MISSED;
        } else if (durationSeconds > 0) {
            outcome = CallOutcome.ANSWERED;
        } else {
            outcome = CallOutcome.UNKNOWN;
        }
        processCallEvent(context, incomingNumber, callStartTime, durationSeconds, outcome);
    }

    /**
     * Dispatch qualifying alert to backend or queue if offline
     */
    public static void dispatchUrgentAlert(
            Context context,
            CallRepository repository,
            CallerProfile profile,
            String phoneNumber,
            UrgencyResult result,
            long callTime
    ) {
        String idempotentId = "evt_" + callTime + "_" + Math.abs((phoneNumber + result.getScore()).hashCode());

        try {
            JSONObject payload = new JSONObject();
            payload.put("idempotentId", idempotentId);
            payload.put("callerName", profile.getName());
            payload.put("callerPhone", phoneNumber);
            payload.put("score", result.getScore());
            payload.put("level", result.getUrgencyLevel().name());
            payload.put("explanation", result.getExplanation());
            payload.put("callTime", callTime);
            payload.put("isSimulation", false);

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String serverUrl = prefs.getString(KEY_SERVER_URL, "").trim();
            String token = prefs.getString(KEY_AUTH_TOKEN, "").trim();
            String role = prefs.getString(KEY_USER_ROLE, "elderly").trim();
            String userId = prefs.getString(KEY_USER_ID, "").trim();
            String userName = prefs.getString(KEY_USER_NAME, "").trim();

            if (!userId.isEmpty()) {
                payload.put("elderlyId", userId);
            }
            if (!userName.isEmpty()) {
                payload.put("elderlyName", userName);
            }

            if (serverUrl.isEmpty()) {
                serverUrl = "https://safecall-backend-kd8k.onrender.com";
            }
            if (role.isEmpty()) {
                role = "elderly";
            }

            boolean sent = sendAlertHttp(serverUrl, token, payload.toString());
            if (sent) {
                Log.i(TAG, "Alert " + idempotentId + " successfully transmitted to backend " + serverUrl);
            } else {
                Log.w(TAG, "Could not transmit alert immediately. Queuing for offline retry: " + idempotentId);
                repository.enqueueOfflineAlert(idempotentId, payload.toString(), callTime);
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to dispatch alert: " + e.getMessage(), e);
            repository.enqueueOfflineAlert(idempotentId, "{}", callTime);
        }
    }

    /**
     * HTTP POST to backend /api/alerts/trigger
     */
    public static boolean sendAlertHttp(String serverUrl, String token, String jsonPayload) {
        HttpURLConnection conn = null;
        try {
            String target = serverUrl.replaceAll("/+$", "") + "/api/alerts/trigger";
            URL url = new URL(target);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("Bypass-Tunnel-Reminder", "true");
            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            } else {
                conn.setRequestProperty("Authorization", "Bearer demo_elderly");
            }
            conn.setRequestProperty("x-user-role", "elderly");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setDoOutput(true);

            byte[] out = jsonPayload.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(out);
                os.flush();
            }

            int code = conn.getResponseCode();
            return (code == 200 || code == 201);
        } catch (Exception e) {
            Log.w(TAG, "sendAlertHttp failed: " + e.getMessage());
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    /**
     * Drain queued offline alerts when network connectivity is available
     */
    public static void drainOfflineAlerts(Context context) {
        if (context == null) return;
        final Context appContext = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                CallRepository repository = new CallRepository(appContext);
                drainOfflineAlertsInternal(appContext, repository);
            } catch (Exception e) {
                Log.e(TAG, "drainOfflineAlerts error: " + e.getMessage());
            }
        });
    }

    private static void drainOfflineAlertsInternal(Context context, CallRepository repository) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String serverUrl = prefs.getString(KEY_SERVER_URL, "").trim();
        String token = prefs.getString(KEY_AUTH_TOKEN, "").trim();
        if (serverUrl.isEmpty()) return;

        List<CallRepository.OfflineAlert> pending = repository.getPendingOfflineAlerts();
        if (pending == null || pending.isEmpty()) return;

        Log.i(TAG, "Found " + pending.size() + " pending offline alerts to drain.");

        for (CallRepository.OfflineAlert alert : pending) {
            boolean success = sendAlertHttp(serverUrl, token, alert.payload);
            if (success) {
                Log.i(TAG, "Drained offline alert: " + alert.idempotentId);
                repository.deleteOfflineAlert(alert.idempotentId);
            } else {
                Log.w(TAG, "Failed draining alert " + alert.idempotentId + ", remaining in queue.");
                break; // Stop draining on connection error to avoid battery drain
            }
        }
    }

    public static String sanitizePhoneNumber(String rawNumber) {
        if (rawNumber == null || rawNumber.trim().isEmpty()) {
            return "UNKNOWN";
        }
        String clean = rawNumber.trim();
        String upper = clean.toUpperCase();
        if (upper.contains("UNKNOWN") || upper.contains("PRIVATE") || upper.contains("RESTRICTED")) {
            return "UNKNOWN";
        }
        clean = clean.replaceAll("[^0-9+]", "");
        return clean.isEmpty() ? "UNKNOWN" : clean;
    }
}
