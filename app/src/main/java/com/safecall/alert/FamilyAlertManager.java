package com.safecall.alert;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class FamilyAlertManager {

    private static final String PREFS_NAME = "safecall_family_alerts";

    // Configuration keys
    private static final String KEY_AUTO_ENABLED = "alert_auto_enabled";
    private static final String KEY_THRESHOLD = "alert_threshold"; // 60, 70, 80
    private static final String KEY_SCHEDULE = "alert_schedule";   // ALL_DAY, DAYTIME, NIGHTTIME
    private static final String KEY_PRIMARY_NAME = "primary_name";
    private static final String KEY_PRIMARY_PHONE = "primary_phone";
    private static final String KEY_NEARBY_NAME = "nearby_name";
    private static final String KEY_NEARBY_PHONE = "nearby_phone";
    private static final String KEY_PERSON_NAME = "elderly_person_name";

    // Legacy keys for backward compatibility
    private static final String KEY_LEGACY_ENABLED = "alert_enabled";
    private static final String KEY_LEGACY_NAME = "recipient_name";
    private static final String KEY_LEGACY_PHONE = "recipient_phone";

    // Cooldown duration: 30 seconds for duplicate event suppression
    public static final long COOLDOWN_MILLIS = 30000L;
    private static long sLastAlertTime = 0;
    private static String sLastAlertPhone = "";
    private static int sLastAlertScore = -1;

    public static class Recipient {
        public final String name;
        public final String phone;
        public final boolean isPrimary;

        public Recipient(String name, String phone, boolean isPrimary) {
            this.name = name;
            this.phone = phone;
            this.isPrimary = isPrimary;
        }
    }

    public interface AlertCallback {
        void onStatusUpdate(String statusMessage, boolean isError);
        void onDeliveryConfirmed(String recipientPhone);
    }

    // --- Configuration Getters & Setters ---

    public static boolean isAutoAlertEnabled(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (prefs.contains(KEY_AUTO_ENABLED)) {
            return prefs.getBoolean(KEY_AUTO_ENABLED, false);
        }
        return prefs.getBoolean(KEY_LEGACY_ENABLED, false);
    }

    public static void setAutoAlertEnabled(Context context, boolean enabled) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_AUTO_ENABLED, enabled).apply();
    }

    public static int getAlertThreshold(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getInt(KEY_THRESHOLD, 60); // Default: 60/100
    }

    public static void setAlertThreshold(Context context, int threshold) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putInt(KEY_THRESHOLD, threshold).apply();
    }

    public static String getAlertSchedule(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_SCHEDULE, "ALL_DAY"); // Default: ALL_DAY
    }

    public static void setAlertSchedule(Context context, String schedule) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_SCHEDULE, schedule).apply();
    }

    public static String getPrimaryName(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String val = prefs.getString(KEY_PRIMARY_NAME, "");
        if (val.isEmpty()) {
            val = prefs.getString(KEY_LEGACY_NAME, "");
        }
        return val;
    }

    public static String getPrimaryPhone(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String val = prefs.getString(KEY_PRIMARY_PHONE, "");
        if (val.isEmpty()) {
            val = prefs.getString(KEY_LEGACY_PHONE, "");
        }
        return val;
    }

    public static String getNearbyName(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_NEARBY_NAME, "");
    }

    public static String getNearbyPhone(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_NEARBY_PHONE, "");
    }

    public static String getPersonName(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_PERSON_NAME, "your family member");
    }

    public static void saveFullAlertSettings(Context context,
                                            boolean autoEnabled,
                                            int threshold,
                                            String schedule,
                                            String primaryName,
                                            String primaryPhone,
                                            String nearbyName,
                                            String nearbyPhone,
                                            String personName) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_AUTO_ENABLED, autoEnabled)
                .putInt(KEY_THRESHOLD, threshold)
                .putString(KEY_SCHEDULE, schedule != null ? schedule : "ALL_DAY")
                .putString(KEY_PRIMARY_NAME, primaryName != null ? primaryName.trim() : "")
                .putString(KEY_PRIMARY_PHONE, primaryPhone != null ? primaryPhone.trim() : "")
                .putString(KEY_NEARBY_NAME, nearbyName != null ? nearbyName.trim() : "")
                .putString(KEY_NEARBY_PHONE, nearbyPhone != null ? nearbyPhone.trim() : "")
                .putString(KEY_PERSON_NAME, (personName != null && !personName.trim().isEmpty()) ? personName.trim() : "your family member")
                // Legacy sync
                .putBoolean(KEY_LEGACY_ENABLED, autoEnabled)
                .putString(KEY_LEGACY_NAME, primaryName != null ? primaryName.trim() : "")
                .putString(KEY_LEGACY_PHONE, primaryPhone != null ? primaryPhone.trim() : "")
                .apply();
    }

    // --- Legacy Compatibility Helpers ---
    public static boolean isAlertEnabled(Context context) {
        return isAutoAlertEnabled(context);
    }

    public static String getRecipientName(Context context) {
        return getPrimaryName(context);
    }

    public static String getRecipientPhone(Context context) {
        return getPrimaryPhone(context);
    }

    public static boolean isRecipientConfigured(Context context) {
        return isSetupComplete(context);
    }

    public static String buildAlertMessage(int score, String explanation) {
        return "SafeCall AI: A communication-priority alert has been triggered for your family member. Score: " + score + "/100. Pattern: " + (explanation != null ? explanation : "Context pattern") + ". Please check in with them. This alert does not confirm an emergency.";
    }

    public static void saveRecipientSettings(Context context, String name, String phone, boolean enabled) {
        saveFullAlertSettings(context, enabled, getAlertThreshold(context), getAlertSchedule(context), name, phone, getNearbyName(context), getNearbyPhone(context), getPersonName(context));
    }

    // --- Recipient Validation & Deduplication ---

    public static boolean isValidPhoneNumber(String phone) {
        if (phone == null) return false;
        String clean = phone.trim();
        if (clean.length() < 5 || clean.length() > 25) return false;
        return clean.matches("^[+]?[0-9\\s\\-()]{5,25}$");
    }

    public static String normalizePhone(String phone) {
        if (phone == null) return "";
        return phone.replaceAll("[^0-9+]", "");
    }

    public static List<Recipient> getValidConfiguredRecipients(Context context) {
        List<Recipient> list = new ArrayList<>();
        String pName = getPrimaryName(context);
        String pPhone = getPrimaryPhone(context);

        if (isValidPhoneNumber(pPhone)) {
            list.add(new Recipient(pName.isEmpty() ? "Primary Contact" : pName, pPhone, true));
        }

        String nName = getNearbyName(context);
        String nPhone = getNearbyPhone(context);

        if (isValidPhoneNumber(nPhone)) {
            String normP = normalizePhone(pPhone);
            String normN = normalizePhone(nPhone);
            // Deduplicate: avoid sending twice if primary and nearby have the exact same number
            if (!normP.equals(normN)) {
                list.add(new Recipient(nName.isEmpty() ? "Nearby Contact" : nName, nPhone, false));
            }
        }
        return list;
    }

    public static boolean isSetupComplete(Context context) {
        String pPhone = getPrimaryPhone(context);
        return isValidPhoneNumber(pPhone);
    }

    // --- Schedule Verification ---

    public static boolean isSchedulePermitted(Context context, long callTimeMillis) {
        String schedule = getAlertSchedule(context);
        if ("ALL_DAY".equalsIgnoreCase(schedule)) {
            return true;
        }

        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(callTimeMillis);
        int hour = cal.get(Calendar.HOUR_OF_DAY);

        if ("DAYTIME".equalsIgnoreCase(schedule)) {
            // Daytime window: 06:00 to 22:00
            return (hour >= 6 && hour < 22);
        } else if ("NIGHTTIME".equalsIgnoreCase(schedule)) {
            // Nighttime window: 22:00 to 06:00
            return (hour >= 22 || hour < 6);
        }
        return true;
    }

    // --- Cooldown & Duplicate Prevention ---

    public static synchronized String checkCooldown(String targetPhone, int score, long now) {
        String norm = normalizePhone(targetPhone);
        if (norm.equals(sLastAlertPhone) && score == sLastAlertScore) {
            long diff = now - sLastAlertTime;
            if (diff >= 0 && diff < COOLDOWN_MILLIS) {
                long remainingSec = (COOLDOWN_MILLIS - diff) / 1000;
                return "Duplicate alert suppressed (cooldown active: sent " + (diff / 1000) + "s ago; retry in " + remainingSec + "s).";
            }
        }
        return null; // Not suppressed
    }

    public static synchronized void recordAlertSent(String targetPhone, int score, long now) {
        sLastAlertPhone = normalizePhone(targetPhone);
        sLastAlertScore = score;
        sLastAlertTime = now;
    }

    // --- Message Construction ---

    public static String buildAlertMessage(Context context, int score, String explanation) {
        String person = getPersonName(context);
        String cleanExp = (explanation != null && !explanation.trim().isEmpty())
                ? explanation.trim()
                : "Contextual call patterns met alert threshold";

        return "SafeCall AI: A communication-priority alert has been triggered for " + person +
                ". Score: " + score + "/100. Pattern: " + cleanExp +
                ". Please check in with them. This alert does not confirm an emergency.";
    }

    // --- Hardware & Permissions Checks ---

    public static boolean hasSmsPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return context.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    public static boolean hasTelephonyCapability(Context context) {
        PackageManager pm = context.getPackageManager();
        return pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY);
    }

    public static boolean isSimReady(Context context) {
        try {
            TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            if (tm == null) return true;
            int state = tm.getSimState();
            // On dual-SIM or modern Android, getSimState() can return SIM_STATE_UNKNOWN (0).
            // Only fail if definitely absent (SIM_STATE_ABSENT = 1).
            return state != TelephonyManager.SIM_STATE_ABSENT;
        } catch (Exception e) {
            return true; // Don't block SMS attempt if telephony inspection throws
        }
    }

    private static SmsManager getSubscriptionAwareSmsManager(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                SmsManager sm = context.getSystemService(SmsManager.class);
                if (sm != null) return sm;
            } catch (Exception ignored) {}
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            try {
                int defaultSubId = SmsManager.getDefaultSmsSubscriptionId();
                if (defaultSubId >= 0) {
                    return SmsManager.getSmsManagerForSubscriptionId(defaultSubId);
                }
            } catch (Exception ignored) {}
        }
        return SmsManager.getDefault();
    }

    // --- Direct SMS Sending with Sent & Delivery Tracking ---

    public static void sendDirectSmsAsync(final Context context,
                                          final String phone,
                                          final String message,
                                          final AlertCallback callback) {
        final Handler mainHandler = new Handler(Looper.getMainLooper());

        new Thread(new Runnable() {
            @Override
            public void run() {
                if (!hasSmsPermission(context)) {
                    postStatus(mainHandler, callback, "SMS permission (SEND_SMS) is not granted by user.", true);
                    return;
                }

                if (!hasTelephonyCapability(context)) {
                    postStatus(mainHandler, callback, "Device hardware does not support telephony/SMS.", true);
                    return;
                }

                if (!isSimReady(context)) {
                    postStatus(mainHandler, callback, "No active cellular SIM card detected on device.", true);
                    return;
                }

                if (!isValidPhoneNumber(phone)) {
                    postStatus(mainHandler, callback, "Invalid recipient phone number: " + phone, true);
                    return;
                }

                final String cleanPhone = normalizePhone(phone);
                if (cleanPhone.isEmpty()) {
                    postStatus(mainHandler, callback, "Normalized phone number is empty.", true);
                    return;
                }

                try {
                    SmsManager smsManager = getSubscriptionAwareSmsManager(context);
                    if (smsManager == null) {
                        postStatus(mainHandler, callback, "Unable to access Android SmsManager.", true);
                        return;
                    }

                    // Create unique action strings for broadcast callbacks
                    final long reqId = System.currentTimeMillis();
                    final String sentAction = "com.safecall.SMS_SENT_" + reqId;
                    final String delAction = "com.safecall.SMS_DELIVERED_" + reqId;

                    Intent sentIntent = new Intent(sentAction);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent sentPI = PendingIntent.getBroadcast(context, 0, sentIntent, flags);

                    Intent delIntent = new Intent(delAction);
                    PendingIntent delPI = PendingIntent.getBroadcast(context, 0, delIntent, flags);

                    // Register Sent BroadcastReceiver
                    final BroadcastReceiver[] sentReceiverRef = new BroadcastReceiver[1];
                    sentReceiverRef[0] = new BroadcastReceiver() {
                        @Override
                        public void onReceive(Context ctx, Intent intent) {
                            try {
                                ctx.unregisterReceiver(sentReceiverRef[0]);
                            } catch (Exception ignored) {}

                            int result = getResultCode();
                            switch (result) {
                                case Activity.RESULT_OK:
                                    postStatus(mainHandler, callback,
                                            "SMS sent by device carrier layer for " + cleanPhone + ".", false);
                                    break;
                                case SmsManager.RESULT_ERROR_NO_SERVICE:
                                    postStatus(mainHandler, callback,
                                            "Sending failed: No cellular service/reception for " + cleanPhone + ".", true);
                                    break;
                                case SmsManager.RESULT_ERROR_RADIO_OFF:
                                    postStatus(mainHandler, callback,
                                            "Sending failed: Cellular radio or airplane mode is active.", true);
                                    break;
                                case SmsManager.RESULT_ERROR_NULL_PDU:
                                    postStatus(mainHandler, callback,
                                            "Sending failed: Null PDU generated.", true);
                                    break;
                                case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                                default:
                                    postStatus(mainHandler, callback,
                                            "Carrier Generic Failure (Code " + result + "). Check:\n" +
                                            "• Android Settings > SIM > Set default SMS SIM (not 'Ask every time')\n" +
                                            "• App Info > Other permissions > Enable 'Send SMS in background'\n" +
                                            "• Active SMS pack balance on SIM", true);
                                    break;
                            }
                        }
                    };

                    // Register Delivery BroadcastReceiver
                    final BroadcastReceiver[] delReceiverRef = new BroadcastReceiver[1];
                    delReceiverRef[0] = new BroadcastReceiver() {
                        @Override
                        public void onReceive(Context ctx, Intent intent) {
                            try {
                                ctx.unregisterReceiver(delReceiverRef[0]);
                            } catch (Exception ignored) {}

                            int result = getResultCode();
                            if (result == Activity.RESULT_OK) {
                                if (callback != null) {
                                    mainHandler.post(() -> callback.onDeliveryConfirmed(cleanPhone));
                                }
                            }
                        }
                    };

                    // Register receivers
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        context.registerReceiver(sentReceiverRef[0], new IntentFilter(sentAction), Context.RECEIVER_NOT_EXPORTED);
                        context.registerReceiver(delReceiverRef[0], new IntentFilter(delAction), Context.RECEIVER_NOT_EXPORTED);
                    } else {
                        context.registerReceiver(sentReceiverRef[0], new IntentFilter(sentAction));
                        context.registerReceiver(delReceiverRef[0], new IntentFilter(delAction));
                    }

                    // Inform that sending is requested
                    postStatus(mainHandler, callback, "SMS sending requested via SIM for " + cleanPhone + "...", false);

                    // Dispatch message with normalized cleanPhone
                    ArrayList<String> parts = smsManager.divideMessage(message);
                    if (parts.size() > 1) {
                        ArrayList<PendingIntent> sentIntents = new ArrayList<>();
                        ArrayList<PendingIntent> delIntents = new ArrayList<>();
                        for (int i = 0; i < parts.size(); i++) {
                            sentIntents.add(sentPI);
                            delIntents.add(delPI);
                        }
                        smsManager.sendMultipartTextMessage(cleanPhone, null, parts, sentIntents, delIntents);
                    } else {
                        smsManager.sendTextMessage(cleanPhone, null, message, sentPI, delPI);
                    }

                } catch (SecurityException se) {
                    postStatus(mainHandler, callback, "SecurityException: SEND_SMS permission denied.", true);
                } catch (Exception e) {
                    postStatus(mainHandler, callback, "SMS dispatch exception: " + e.getMessage(), true);
                }
            }
        }).start();
    }

    // --- Manual Fallback & Dialler Actions ---

    public static boolean launchSmsAppFallback(Activity activity, String phone, String message) {
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("smsto:" + Uri.encode(phone)));
            intent.putExtra("sms_body", message);
            activity.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean launchDialler(Activity activity, String phone) {
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + Uri.encode(phone)));
            activity.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static void postStatus(Handler handler, final AlertCallback callback, final String msg, final boolean isError) {
        if (callback != null) {
            handler.post(() -> callback.onStatusUpdate(msg, isError));
        }
    }
}
