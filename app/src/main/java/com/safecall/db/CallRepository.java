package com.safecall.db;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.safecall.model.CallerProfile;
import com.safecall.model.CallRecord;
import java.util.ArrayList;
import java.util.List;

public class CallRepository {
    private DatabaseHelper dbHelper;

    public CallRepository(Context context) {
        dbHelper = new DatabaseHelper(context);
    }

    public void addOrUpdateContact(CallerProfile profile) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put("name", profile.getName());
        values.put("phoneNumber", profile.getPhoneNumber());
        values.put("relationship", profile.getRelationship());
        values.put("priority", profile.getPriority().name());
        db.insertWithOnConflict("contacts", null, values, SQLiteDatabase.CONFLICT_REPLACE);
        db.close();
    }

    public void deleteContact(String phoneNumber) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.delete("contacts", "phoneNumber=?", new String[]{phoneNumber});
        db.close();
    }

    public CallerProfile getContactByPhone(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return null;
        String rawClean = phoneNumber.replaceAll("[^0-9]", "");
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query("contacts", null, null, null, null, null, null);
        CallerProfile matched = null;
        if (cursor != null) {
            while (cursor.moveToNext()) {
                CallerProfile p = parseProfile(cursor);
                String pClean = p.getPhoneNumber() != null ? p.getPhoneNumber().replaceAll("[^0-9]", "") : "";
                if (pClean.equals(rawClean) || 
                    (rawClean.length() >= 10 && pClean.endsWith(rawClean.substring(rawClean.length() - 10))) ||
                    (pClean.length() >= 10 && rawClean.endsWith(pClean.substring(pClean.length() - 10)))) {
                    matched = p;
                    break;
                }
            }
            cursor.close();
        }
        db.close();
        return matched;
    }

    public List<CallerProfile> getAllContacts() {
        List<CallerProfile> list = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query("contacts", null, null, null, null, null, null);
        if (cursor != null) {
            while (cursor.moveToNext()) {
                list.add(parseProfile(cursor));
            }
            cursor.close();
        }
        db.close();
        return list;
    }

    private CallerProfile parseProfile(Cursor cursor) {
        long id = cursor.getLong(cursor.getColumnIndexOrThrow("id"));
        String name = cursor.getString(cursor.getColumnIndexOrThrow("name"));
        String phone = cursor.getString(cursor.getColumnIndexOrThrow("phoneNumber"));
        String rel = cursor.getString(cursor.getColumnIndexOrThrow("relationship"));
        CallerProfile.Priority prio = CallerProfile.Priority.valueOf(cursor.getString(cursor.getColumnIndexOrThrow("priority")));
        return new CallerProfile(id, name, phone, rel, prio);
    }

    public void saveCallRecord(CallRecord record) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put("phoneNumber", record.getPhoneNumber());
        values.put("timestamp", record.getTimestamp());
        values.put("durationSeconds", record.getDurationSeconds());
        values.put("urgencyScore", record.getUrgencyScore());
        values.put("urgencyLevel", record.getUrgencyLevel());
        values.put("explanation", record.getExplanation());
        values.put("callOutcome", record.getCallOutcome() != null ? record.getCallOutcome().name() : "UNKNOWN");
        values.put("isSimulation", record.isSimulation() ? 1 : 0);
        db.insert("call_history", null, values);
        db.close();
    }

    public List<CallRecord> getRecentCalls(String phoneNumber, long sinceTimestamp) {
        List<CallRecord> list = new ArrayList<>();
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return list;
        String rawClean = phoneNumber.replaceAll("[^0-9]", "");
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query("call_history", null, "timestamp>=?", 
                new String[]{String.valueOf(sinceTimestamp)}, null, null, "timestamp DESC");
        if (cursor != null) {
            while (cursor.moveToNext()) {
                CallRecord rec = parseRecord(cursor);
                String recClean = rec.getPhoneNumber() != null ? rec.getPhoneNumber().replaceAll("[^0-9]", "") : "";
                if (recClean.equals(rawClean) || 
                    (rawClean.length() >= 10 && recClean.endsWith(rawClean.substring(rawClean.length() - 10))) ||
                    (recClean.length() >= 10 && rawClean.endsWith(recClean.substring(rawClean.length() - 10)))) {
                    list.add(rec);
                }
            }
            cursor.close();
        }
        db.close();
        return list;
    }

    public List<CallRecord> getAllCallRecords() {
        List<CallRecord> list = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query("call_history", null, null, null, null, null, "timestamp DESC");
        if (cursor != null) {
            while (cursor.moveToNext()) {
                list.add(parseRecord(cursor));
            }
            cursor.close();
        }
        db.close();
        return list;
    }

    public List<CallRecord> getNonSimulationCallRecords() {
        List<CallRecord> list = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query("call_history", null, "isSimulation = 0 OR isSimulation IS NULL", null, null, null, "timestamp DESC");
        if (cursor != null) {
            while (cursor.moveToNext()) {
                list.add(parseRecord(cursor));
            }
            cursor.close();
        }
        db.close();
        return list;
    }

    private CallRecord parseRecord(Cursor cursor) {
        long id = cursor.getLong(cursor.getColumnIndexOrThrow("id"));
        String phone = cursor.getString(cursor.getColumnIndexOrThrow("phoneNumber"));
        long ts = cursor.getLong(cursor.getColumnIndexOrThrow("timestamp"));
        int dur = cursor.getInt(cursor.getColumnIndexOrThrow("durationSeconds"));
        int score = cursor.getInt(cursor.getColumnIndexOrThrow("urgencyScore"));
        String lvl = cursor.getString(cursor.getColumnIndexOrThrow("urgencyLevel"));
        String exp = cursor.getString(cursor.getColumnIndexOrThrow("explanation"));

        com.safecall.model.CallOutcome outcome = com.safecall.model.CallOutcome.UNKNOWN;
        int outcomeIdx = cursor.getColumnIndex("callOutcome");
        if (outcomeIdx != -1 && !cursor.isNull(outcomeIdx)) {
            try {
                outcome = com.safecall.model.CallOutcome.valueOf(cursor.getString(outcomeIdx));
            } catch (Exception ignored) {}
        }

        boolean isSim = false;
        int simIdx = cursor.getColumnIndex("isSimulation");
        if (simIdx != -1 && !cursor.isNull(simIdx)) {
            isSim = (cursor.getInt(simIdx) == 1);
        }

        return new CallRecord(id, phone, ts, dur, score, lvl, exp, outcome, isSim);
    }

    public void clearCallHistory() {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.delete("call_history", null, null);
        db.close();
    }

    public static class OfflineAlert {
        public final long id;
        public final String idempotentId;
        public final String payload;
        public final long timestamp;
        public final int retryCount;

        public OfflineAlert(long id, String idempotentId, String payload, long timestamp, int retryCount) {
            this.id = id;
            this.idempotentId = idempotentId;
            this.payload = payload;
            this.timestamp = timestamp;
            this.retryCount = retryCount;
        }
    }

    public void enqueueOfflineAlert(String idempotentId, String payload, long timestamp) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put("idempotentId", idempotentId);
        values.put("payload", payload);
        values.put("timestamp", timestamp);
        values.put("retryCount", 0);
        db.insertWithOnConflict("offline_alerts", null, values, SQLiteDatabase.CONFLICT_IGNORE);
        db.close();
    }

    public List<OfflineAlert> getPendingOfflineAlerts() {
        List<OfflineAlert> list = new ArrayList<>();
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.query("offline_alerts", null, null, null, null, null, "timestamp ASC");
        if (cursor != null) {
            while (cursor.moveToNext()) {
                long id = cursor.getLong(cursor.getColumnIndexOrThrow("id"));
                String idempotentId = cursor.getString(cursor.getColumnIndexOrThrow("idempotentId"));
                String payload = cursor.getString(cursor.getColumnIndexOrThrow("payload"));
                long ts = cursor.getLong(cursor.getColumnIndexOrThrow("timestamp"));
                int retry = cursor.getInt(cursor.getColumnIndexOrThrow("retryCount"));
                list.add(new OfflineAlert(id, idempotentId, payload, ts, retry));
            }
            cursor.close();
        }
        db.close();
        return list;
    }

    public void deleteOfflineAlert(String idempotentId) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        db.delete("offline_alerts", "idempotentId=?", new String[]{idempotentId});
        db.close();
    }

    public int getOfflineAlertCount() {
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM offline_alerts", null);
        int count = 0;
        if (cursor != null) {
            if (cursor.moveToFirst()) {
                count = cursor.getInt(0);
            }
            cursor.close();
        }
        db.close();
        return count;
    }
}
