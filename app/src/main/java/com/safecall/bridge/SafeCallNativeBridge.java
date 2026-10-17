package com.safecall.bridge;

import android.app.Activity;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import com.safecall.alert.FamilyAlertManager;
import com.safecall.db.CallRepository;
import com.safecall.engine.WeightedRuleEngine;
import com.safecall.model.CallContext;
import com.safecall.model.CallRecord;
import com.safecall.model.CallerProfile;
import com.safecall.model.UrgencyResult;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class SafeCallNativeBridge {

    private final Activity activity;
    private final CallRepository repository;
    private final WeightedRuleEngine engine;

    public SafeCallNativeBridge(Activity activity, CallRepository repository, WeightedRuleEngine engine) {
        this.activity = activity;
        this.repository = repository;
        this.engine = engine;
    }

    @JavascriptInterface
    public String getPlatformInfo() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("platform", "android-native");
            obj.put("sdkInt", Build.VERSION.SDK_INT);
            obj.put("hasTelephony", FamilyAlertManager.hasTelephonyCapability(activity));
            obj.put("hasSmsPermission", FamilyAlertManager.hasSmsPermission(activity));
            obj.put("simReady", FamilyAlertManager.isSimReady(activity));
            return obj.toString();
        } catch (Exception e) {
            return "{\"platform\":\"android-native\",\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @JavascriptInterface
    public String evaluateUrgency(String contextJson) {
        try {
            JSONObject root = new JSONObject(contextJson);
            JSONObject profileObj = root.optJSONObject("profile");
            CallerProfile profile = null;
            if (profileObj != null) {
                String name = profileObj.optString("name", "Unknown");
                String phone = profileObj.optString("phone", "");
                String rel = profileObj.optString("relationship", "Other");
                String prioStr = profileObj.optString("priority", "NORMAL");
                CallerProfile.Priority prio = CallerProfile.Priority.NORMAL;
                try {
                    prio = CallerProfile.Priority.valueOf(prioStr.toUpperCase());
                } catch (Exception ignored) {}
                profile = new CallerProfile(0, name, phone, rel, prio);
            }

            long callTime = root.optLong("callTime", System.currentTimeMillis());

            List<CallRecord> recentCalls = new ArrayList<>();
            JSONArray recentArr = root.optJSONArray("recentCalls");
            if (recentArr != null) {
                for (int i = 0; i < recentArr.length(); i++) {
                    JSONObject r = recentArr.getJSONObject(i);
                    recentCalls.add(new CallRecord(
                            0,
                            r.optString("phone", ""),
                            r.optLong("timestamp", 0),
                            r.optInt("duration", 0),
                            0,
                            "LOW",
                            ""
                    ));
                }
            }

            List<CallRecord> historyCalls = new ArrayList<>();
            JSONArray histArr = root.optJSONArray("historyCalls");
            if (histArr != null) {
                for (int i = 0; i < histArr.length(); i++) {
                    JSONObject h = histArr.getJSONObject(i);
                    historyCalls.add(new CallRecord(
                            0,
                            h.optString("phone", ""),
                            h.optLong("timestamp", 0),
                            h.optInt("duration", 0),
                            0,
                            "",
                            ""
                    ));
                }
            }

            CallContext ctx = new CallContext(profile, recentCalls, historyCalls, callTime);
            UrgencyResult result = engine.evaluate(ctx);

            JSONObject response = new JSONObject();
            response.put("score", result.getScore());
            response.put("level", result.getUrgencyLevel().name());
            response.put("explanation", result.getExplanation());
            return response.toString();
        } catch (Exception e) {
            return "{\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @JavascriptInterface
    public String getContacts() {
        try {
            List<CallerProfile> list = repository.getAllContacts();
            JSONArray arr = new JSONArray();
            if (list != null) {
                for (CallerProfile cp : list) {
                    JSONObject obj = new JSONObject();
                    obj.put("id", cp.getId());
                    obj.put("name", cp.getName());
                    obj.put("phone", cp.getPhoneNumber());
                    obj.put("relationship", cp.getRelationship());
                    obj.put("priority", cp.getPriority() != null ? cp.getPriority().name() : "NORMAL");
                    arr.put(obj);
                }
            }
            return arr.toString();
        } catch (Exception e) {
            return "[]";
        }
    }

    @JavascriptInterface
    public boolean saveContact(String contactJson) {
        try {
            JSONObject obj = new JSONObject(contactJson);
            int id = obj.optInt("id", 0);
            String name = obj.optString("name", "");
            String phone = obj.optString("phone", "");
            String rel = obj.optString("relationship", "Other");
            String prioStr = obj.optString("priority", "NORMAL");
            CallerProfile.Priority prio = CallerProfile.Priority.NORMAL;
            try {
                prio = CallerProfile.Priority.valueOf(prioStr.toUpperCase());
            } catch (Exception ignored) {}

            CallerProfile profile = new CallerProfile(id, name, phone, rel, prio);
            repository.addOrUpdateContact(profile);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public String getCallHistory() {
        try {
            List<CallRecord> list = repository.getAllCallRecords();
            JSONArray arr = new JSONArray();
            if (list != null) {
                for (CallRecord cr : list) {
                    JSONObject obj = new JSONObject();
                    obj.put("id", cr.getId());
                    obj.put("phone", cr.getPhoneNumber());
                    obj.put("timestamp", cr.getTimestamp());
                    obj.put("duration", cr.getDurationSeconds());
                    obj.put("score", cr.getUrgencyScore());
                    obj.put("level", cr.getUrgencyLevel());
                    obj.put("explanation", cr.getExplanation());
                    obj.put("outcome", cr.getCallOutcome() != null ? cr.getCallOutcome().name() : "UNKNOWN");
                    obj.put("isSimulation", cr.isSimulation());
                    arr.put(obj);
                }
            }
            return arr.toString();
        } catch (Exception e) {
            return "[]";
        }
    }

    @JavascriptInterface
    public boolean saveCallRecord(String recordJson) {
        try {
            JSONObject obj = new JSONObject(recordJson);
            com.safecall.model.CallOutcome outcome = com.safecall.model.CallOutcome.UNKNOWN;
            String outcomeStr = obj.optString("outcome", obj.optString("callOutcome", ""));
            if (!outcomeStr.isEmpty()) {
                try {
                    outcome = com.safecall.model.CallOutcome.valueOf(outcomeStr.toUpperCase());
                } catch (Exception ignored) {}
            }
            boolean isSim = obj.optBoolean("isSimulation", true); // Calls recorded from UI simulation default to isSimulation=true
            CallRecord cr = new CallRecord(
                    0,
                    obj.optString("phone", ""),
                    obj.optLong("timestamp", System.currentTimeMillis()),
                    obj.optInt("duration", 0),
                    obj.optInt("score", 0),
                    obj.optString("level", "LOW"),
                    obj.optString("explanation", ""),
                    outcome,
                    isSim
            );
            repository.saveCallRecord(cr);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void reportUserActivity() {
        com.safecall.engine.SequenceTracker.getInstance().onUserActivity(activity);
    }

    @JavascriptInterface
    public void syncSession(String serverUrl, String token, String userId, String userName, String role) {
        try {
            android.content.SharedPreferences prefs = activity.getSharedPreferences(
                    com.safecall.engine.CallEventProcessor.PREFS_NAME, android.content.Context.MODE_PRIVATE);
            prefs.edit()
                    .putString(com.safecall.engine.CallEventProcessor.KEY_SERVER_URL, (serverUrl != null) ? serverUrl.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_AUTH_TOKEN, (token != null) ? token.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_USER_ID, (userId != null) ? userId.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_USER_NAME, (userName != null) ? userName.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_USER_ROLE, (role != null) ? role.trim() : "")
                    .apply();
            android.util.Log.i("SafeCallNativeBridge", "Synced native session: User=" + userName +
                    " (" + userId + "), Role=" + role + ", Server=" + serverUrl);
        } catch (Exception e) {
            android.util.Log.e("SafeCallNativeBridge", "Failed to sync session: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public String getPendingSequenceStatus() {
        try {
            com.safecall.db.PendingAlertRepository repo = new com.safecall.db.PendingAlertRepository(activity);
            com.safecall.model.PendingSequence seq = repo.getActiveSequence();
            org.json.JSONObject obj = new org.json.JSONObject();
            if (seq != null) {
                obj.put("active", true);
                obj.put("sequenceId", seq.sequenceId);
                obj.put("missedCount", seq.missedCount);
                obj.put("maxGate", com.safecall.engine.NonResponsePolicyEngine.MIN_MISSED_FOR_GATE);
                obj.put("status", seq.status);
                obj.put("callerCount", seq.getDistinctCallerCount());
                obj.put("firstMissedAt", seq.firstMissedAt);
                obj.put("gracePeriodStartAt", seq.gracePeriodStartAt);
            } else {
                obj.put("active", false);
                obj.put("missedCount", 0);
                obj.put("maxGate", 4);
                obj.put("status", "IDLE");
            }
            return obj.toString();
        } catch (Exception e) {
            return "{\"active\":false,\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @JavascriptInterface
    public String getAlertSettings() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("autoEnabled", FamilyAlertManager.isAutoAlertEnabled(activity));
            obj.put("threshold", FamilyAlertManager.getAlertThreshold(activity));
            obj.put("schedule", FamilyAlertManager.getAlertSchedule(activity));
            obj.put("primaryName", FamilyAlertManager.getPrimaryName(activity));
            obj.put("primaryPhone", FamilyAlertManager.getPrimaryPhone(activity));
            obj.put("nearbyName", FamilyAlertManager.getNearbyName(activity));
            obj.put("nearbyPhone", FamilyAlertManager.getNearbyPhone(activity));
            obj.put("personName", FamilyAlertManager.getPersonName(activity));
            return obj.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public boolean saveAlertSettings(String settingsJson) {
        try {
            JSONObject obj = new JSONObject(settingsJson);
            FamilyAlertManager.saveFullAlertSettings(
                    activity,
                    obj.optBoolean("autoEnabled", false),
                    obj.optInt("threshold", 60),
                    obj.optString("schedule", "ALL_DAY"),
                    obj.optString("primaryName", ""),
                    obj.optString("primaryPhone", ""),
                    obj.optString("nearbyName", ""),
                    obj.optString("nearbyPhone", ""),
                    obj.optString("personName", "your family member")
            );
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @JavascriptInterface
    public void launchDialler(String phone) {
        activity.runOnUiThread(() -> FamilyAlertManager.launchDialler(activity, phone));
    }

    @JavascriptInterface
    public void launchSmsFallback(String phone, String message) {
        activity.runOnUiThread(() -> FamilyAlertManager.launchSmsAppFallback(activity, phone, message));
    }

    @JavascriptInterface
    public void showToast(String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_SHORT).show());
    }

    @JavascriptInterface
    public void showSystemNotification(String title, String message, int score) {
        activity.runOnUiThread(() -> {
            try {
                android.app.NotificationManager notificationManager = 
                        (android.app.NotificationManager) activity.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
                if (notificationManager == null) return;

                android.net.Uri defaultSoundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);

                String channelId = "safecall_system_tone_v3";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    android.app.NotificationChannel channel = new android.app.NotificationChannel(
                            channelId,
                            "SafeCall AI Care Alerts",
                            android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("SafeCall care alerts with standard system notification tone");
                    channel.enableVibration(true);
                    channel.enableLights(true);

                    android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                            .build();
                    channel.setSound(defaultSoundUri, audioAttributes);

                    notificationManager.createNotificationChannel(channel);
                }

                android.content.Intent intent = new android.content.Intent(activity, com.safecall.MainActivity.class);
                intent.setFlags(android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
                int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
                }
                android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(activity, 0, intent, flags);

                android.app.Notification.Builder builder;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    builder = new android.app.Notification.Builder(activity, channelId);
                } else {
                    builder = new android.app.Notification.Builder(activity);
                }

                builder.setContentTitle(title)
                       .setContentText(message)
                       .setSmallIcon(android.R.drawable.ic_dialog_alert)
                       .setContentIntent(pendingIntent)
                       .setAutoCancel(true)
                       .setSound(defaultSoundUri)
                       .setDefaults(android.app.Notification.DEFAULT_ALL)
                       .setPriority(android.app.Notification.PRIORITY_HIGH);

                notificationManager.notify((int) System.currentTimeMillis(), builder.build());

                // Play the exact device system notification ringtone
                try {
                    android.media.Ringtone ringtone = android.media.RingtoneManager.getRingtone(activity.getApplicationContext(), defaultSoundUri);
                    if (ringtone != null) {
                        ringtone.play();
                    }
                } catch (Exception ignored) {}

                Toast.makeText(activity, "🚨 " + title, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                android.util.Log.e("SafeCallNativeBridge", "Notification error: " + e.getMessage());
            }
        });
    }

    @JavascriptInterface
    public void syncAuthState(String serverUrl, String token, String role, String userId, String userName) {
        try {
            android.content.SharedPreferences prefs = activity.getSharedPreferences(
                    com.safecall.engine.CallEventProcessor.PREFS_NAME, android.content.Context.MODE_PRIVATE);
            prefs.edit()
                    .putString(com.safecall.engine.CallEventProcessor.KEY_SERVER_URL, serverUrl != null ? serverUrl.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_AUTH_TOKEN, token != null ? token.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_USER_ROLE, role != null ? role.trim() : "elderly")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_USER_ID, userId != null ? userId.trim() : "")
                    .putString(com.safecall.engine.CallEventProcessor.KEY_USER_NAME, userName != null ? userName.trim() : "")
                    .apply();

            // Trigger offline queue drain if now connected
            com.safecall.engine.CallEventProcessor.drainOfflineAlerts(activity);
        } catch (Exception e) {
            android.util.Log.e("SafeCallNativeBridge", "syncAuthState error: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public int getOfflineAlertsCount() {
        try {
            return repository.getOfflineAlertCount();
        } catch (Exception e) {
            return 0;
        }
    }

    @JavascriptInterface
    public void triggerOfflineSync() {
        com.safecall.engine.CallEventProcessor.drainOfflineAlerts(activity);
    }

    @JavascriptInterface
    public String getTelephonyPermissionStatus() {
        try {
            JSONObject obj = new JSONObject();
            boolean hasPhoneState = true;
            boolean hasCallLog = true;
            boolean hasNotifications = true;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                hasPhoneState = activity.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                hasCallLog = activity.checkSelfPermission(android.Manifest.permission.READ_CALL_LOG) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                hasNotifications = activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            obj.put("hasPhoneState", hasPhoneState);
            obj.put("hasCallLog", hasCallLog);
            obj.put("hasNotifications", hasNotifications);
            obj.put("allGranted", hasPhoneState && hasCallLog && hasNotifications);
            return obj.toString();
        } catch (Exception e) {
            return "{\"hasPhoneState\":false,\"hasCallLog\":false,\"hasNotifications\":false,\"allGranted\":false}";
        }
    }

    @JavascriptInterface
    public void requestTelephonyPermissions() {
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                List<String> perms = new ArrayList<>();
                if (activity.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.READ_PHONE_STATE);
                }
                if (activity.checkSelfPermission(android.Manifest.permission.READ_CALL_LOG) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.READ_CALL_LOG);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    if (activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add(android.Manifest.permission.POST_NOTIFICATIONS);
                    }
                }
                if (!perms.isEmpty()) {
                    activity.requestPermissions(perms.toArray(new String[0]), 201);
                } else {
                    Toast.makeText(activity, "All telephony & notification permissions are active!", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}
