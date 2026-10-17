package com.safecall.db;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Log;

import com.safecall.model.PendingSequence;

import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for persisting and retrieving active non-response monitoring sequences
 * in the SQLite pending_alerts table.
 */
public class PendingAlertRepository {

    private static final String TAG = "PendingAlertRepo";
    private final DatabaseHelper dbHelper;

    public PendingAlertRepository(Context context) {
        this.dbHelper = new DatabaseHelper(context.getApplicationContext());
    }

    public synchronized void saveSequence(PendingSequence sequence) {
        if (sequence == null) return;
        SQLiteDatabase db = null;
        try {
            db = dbHelper.getWritableDatabase();
            ContentValues values = new ContentValues();
            values.put("sequenceId", sequence.sequenceId);
            values.put("firstMissedAt", sequence.firstMissedAt);
            values.put("missedCount", sequence.missedCount);
            values.put("distinctCallers", sequence.getDistinctCallersJson());
            values.put("gracePeriodStartAt", sequence.gracePeriodStartAt);
            values.put("status", sequence.status);
            values.put("lastUpdated", sequence.lastUpdated > 0 ? sequence.lastUpdated : System.currentTimeMillis());

            long id = db.insertWithOnConflict("pending_alerts", null, values, SQLiteDatabase.CONFLICT_REPLACE);
            if (id > 0) {
                sequence.dbId = id;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error saving pending sequence: " + e.getMessage(), e);
        } finally {
            if (db != null) {
                try { db.close(); } catch (Exception ignored) {}
            }
        }
    }

    public synchronized PendingSequence getActiveSequence() {
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            db = dbHelper.getReadableDatabase();
            cursor = db.query(
                    "pending_alerts",
                    null,
                    "status IN (?, ?)",
                    new String[]{PendingSequence.STATUS_ACCUMULATING, PendingSequence.STATUS_GRACE_PERIOD},
                    null,
                    null,
                    "lastUpdated DESC",
                    "1"
            );

            if (cursor != null && cursor.moveToFirst()) {
                return parseCursor(cursor);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching active sequence: " + e.getMessage(), e);
        } finally {
            if (cursor != null) {
                try { cursor.close(); } catch (Exception ignored) {}
            }
            if (db != null) {
                try { db.close(); } catch (Exception ignored) {}
            }
        }
        return null;
    }

    public synchronized PendingSequence getSequenceById(String sequenceId) {
        if (sequenceId == null || sequenceId.isEmpty()) return null;
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            db = dbHelper.getReadableDatabase();
            cursor = db.query(
                    "pending_alerts",
                    null,
                    "sequenceId=?",
                    new String[]{sequenceId},
                    null,
                    null,
                    null
            );

            if (cursor != null && cursor.moveToFirst()) {
                return parseCursor(cursor);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching sequence by id: " + e.getMessage(), e);
        } finally {
            if (cursor != null) {
                try { cursor.close(); } catch (Exception ignored) {}
            }
            if (db != null) {
                try { db.close(); } catch (Exception ignored) {}
            }
        }
        return null;
    }

    public synchronized void updateStatus(String sequenceId, String newStatus) {
        if (sequenceId == null || sequenceId.isEmpty()) return;
        SQLiteDatabase db = null;
        try {
            db = dbHelper.getWritableDatabase();
            ContentValues values = new ContentValues();
            values.put("status", newStatus);
            values.put("lastUpdated", System.currentTimeMillis());
            db.update("pending_alerts", values, "sequenceId=?", new String[]{sequenceId});
        } catch (Exception e) {
            Log.e(TAG, "Error updating sequence status: " + e.getMessage(), e);
        } finally {
            if (db != null) {
                try { db.close(); } catch (Exception ignored) {}
            }
        }
    }

    public synchronized void cancelActiveSequences() {
        SQLiteDatabase db = null;
        try {
            db = dbHelper.getWritableDatabase();
            ContentValues values = new ContentValues();
            values.put("status", PendingSequence.STATUS_RESOLVED);
            values.put("lastUpdated", System.currentTimeMillis());
            db.update("pending_alerts", values, "status IN (?, ?)",
                    new String[]{PendingSequence.STATUS_ACCUMULATING, PendingSequence.STATUS_GRACE_PERIOD});
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling active sequences: " + e.getMessage(), e);
        } finally {
            if (db != null) {
                try { db.close(); } catch (Exception ignored) {}
            }
        }
    }

    private PendingSequence parseCursor(Cursor cursor) {
        PendingSequence seq = new PendingSequence();
        seq.dbId = cursor.getLong(cursor.getColumnIndexOrThrow("id"));
        seq.sequenceId = cursor.getString(cursor.getColumnIndexOrThrow("sequenceId"));
        seq.firstMissedAt = cursor.getLong(cursor.getColumnIndexOrThrow("firstMissedAt"));
        seq.missedCount = cursor.getInt(cursor.getColumnIndexOrThrow("missedCount"));
        seq.gracePeriodStartAt = cursor.getLong(cursor.getColumnIndexOrThrow("gracePeriodStartAt"));
        seq.status = cursor.getString(cursor.getColumnIndexOrThrow("status"));
        seq.lastUpdated = cursor.getLong(cursor.getColumnIndexOrThrow("lastUpdated"));

        String callersJson = cursor.getString(cursor.getColumnIndexOrThrow("distinctCallers"));
        seq.setDistinctCallersFromJson(callersJson);
        return seq;
    }
}
