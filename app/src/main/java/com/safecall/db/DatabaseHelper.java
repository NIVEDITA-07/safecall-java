package com.safecall.db;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "safecall.db";
    private static final int DATABASE_VERSION = 4; // Upgraded schema with pending_alerts & call_history enhancements

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS contacts (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "name TEXT, " +
                "phoneNumber TEXT UNIQUE, " +
                "relationship TEXT, " +
                "priority TEXT)");

        db.execSQL("CREATE TABLE IF NOT EXISTS call_history (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "phoneNumber TEXT, " +
                "timestamp INTEGER, " +
                "durationSeconds INTEGER, " +
                "urgencyScore INTEGER, " +
                "urgencyLevel TEXT, " +
                "explanation TEXT, " +
                "callOutcome TEXT, " +
                "isSimulation INTEGER DEFAULT 0)");

        db.execSQL("CREATE TABLE IF NOT EXISTS offline_alerts (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "idempotentId TEXT UNIQUE, " +
                "payload TEXT, " +
                "timestamp INTEGER, " +
                "retryCount INTEGER)");

        db.execSQL("CREATE TABLE IF NOT EXISTS pending_alerts (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "sequenceId TEXT UNIQUE, " +
                "firstMissedAt INTEGER NOT NULL, " +
                "missedCount INTEGER DEFAULT 0, " +
                "distinctCallers TEXT, " +
                "gracePeriodStartAt INTEGER, " +
                "status TEXT DEFAULT 'ACCUMULATING', " +
                "lastUpdated INTEGER)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 3) {
            db.execSQL("CREATE TABLE IF NOT EXISTS offline_alerts (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "idempotentId TEXT UNIQUE, " +
                    "payload TEXT, " +
                    "timestamp INTEGER, " +
                    "retryCount INTEGER)");
        }
        if (oldVersion < 4) {
            db.execSQL("CREATE TABLE IF NOT EXISTS pending_alerts (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    "sequenceId TEXT UNIQUE, " +
                    "firstMissedAt INTEGER NOT NULL, " +
                    "missedCount INTEGER DEFAULT 0, " +
                    "distinctCallers TEXT, " +
                    "gracePeriodStartAt INTEGER, " +
                    "status TEXT DEFAULT 'ACCUMULATING', " +
                    "lastUpdated INTEGER)");
            try {
                db.execSQL("ALTER TABLE call_history ADD COLUMN callOutcome TEXT");
            } catch (Exception ignored) {}
            try {
                db.execSQL("ALTER TABLE call_history ADD COLUMN isSimulation INTEGER DEFAULT 0");
            } catch (Exception ignored) {}
        }
    }
}
