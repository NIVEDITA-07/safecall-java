package com.safecall;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.safecall.db.CallRepository;
import com.safecall.model.CallerProfile;
import com.safecall.model.CallRecord;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class CallHistoryActivity extends Activity {

    private CallRepository repository;
    private LinearLayout recordsContainer;
    private SimpleDateFormat dateFormat;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = new CallRepository(this);
        dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());

        // Root ScrollView
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);

        // Main Layout
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setPadding(32, 32, 32, 32);

        // Header Title
        TextView titleView = new TextView(this);
        titleView.setText("Call History & Evaluations");
        titleView.setTextSize(24f);
        titleView.setTypeface(null, Typeface.BOLD);
        titleView.setTextColor(Color.DKGRAY);
        titleView.setPadding(0, 0, 0, 8);
        mainLayout.addView(titleView);

        // Subtitle
        TextView descView = new TextView(this);
        descView.setText("Log of incoming call evaluations, urgency scores, and rule explanations.");
        descView.setTextSize(14f);
        descView.setTextColor(Color.GRAY);
        descView.setPadding(0, 0, 0, 24);
        mainLayout.addView(descView);

        // Actions Bar (Back & Clear History)
        LinearLayout actionsRow = new LinearLayout(this);
        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
        actionsRow.setPadding(0, 0, 0, 24);

        Button backBtn = new Button(this);
        backBtn.setText("Back to Dashboard");
        backBtn.setTextSize(14f);
        backBtn.setPadding(20, 16, 20, 16);
        LinearLayout.LayoutParams backParams = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        backParams.setMargins(0, 0, 12, 0);
        backBtn.setLayoutParams(backParams);
        backBtn.setOnClickListener(v -> finish());
        actionsRow.addView(backBtn);

        Button clearBtn = new Button(this);
        clearBtn.setText("Clear Log");
        clearBtn.setTextSize(14f);
        clearBtn.setTextColor(Color.RED);
        clearBtn.setPadding(20, 16, 20, 16);
        clearBtn.setOnClickListener(v -> confirmClearHistory());
        actionsRow.addView(clearBtn);

        mainLayout.addView(actionsRow);

        // History Section Header
        TextView historyHeader = new TextView(this);
        historyHeader.setText("Recorded Evaluations");
        historyHeader.setTextSize(18f);
        historyHeader.setTypeface(null, Typeface.BOLD);
        historyHeader.setPadding(0, 0, 0, 16);
        mainLayout.addView(historyHeader);

        // Dynamic Records Container
        recordsContainer = new LinearLayout(this);
        recordsContainer.setOrientation(LinearLayout.VERTICAL);
        mainLayout.addView(recordsContainer);

        scrollView.addView(mainLayout);
        setContentView(scrollView);
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshHistoryList();
    }

    private void refreshHistoryList() {
        recordsContainer.removeAllViews();
        List<CallRecord> records = repository.getAllCallRecords();

        if (records == null || records.isEmpty()) {
            TextView emptyView = new TextView(this);
            emptyView.setText("No call evaluations recorded yet.\nRun a simulation from the dashboard to evaluate incoming calls and view scores here.");
            emptyView.setTextSize(15f);
            emptyView.setTextColor(Color.GRAY);
            emptyView.setGravity(Gravity.CENTER);
            emptyView.setPadding(24, 48, 24, 48);
            recordsContainer.addView(emptyView);
            return;
        }

        for (CallRecord record : records) {
            recordsContainer.addView(createRecordCard(record));
        }
    }

    private View createRecordCard(CallRecord record) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(24, 24, 24, 24);
        card.setBackgroundColor(Color.rgb(247, 248, 250));

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 0, 0, 16);
        card.setLayoutParams(cardParams);

        // Lookup contact name if available
        String phone = (record.getPhoneNumber() != null) ? record.getPhoneNumber() : "Unknown Number";
        CallerProfile profile = repository.getContactByPhone(phone);
        String displayName = (profile != null && profile.getName() != null)
                ? profile.getName() + " (" + phone + ")"
                : phone;

        // Top Row: Phone/Name and Urgency Level Badge
        LinearLayout topRow = new LinearLayout(this);
        topRow.setOrientation(LinearLayout.HORIZONTAL);

        TextView callerText = new TextView(this);
        callerText.setText(displayName);
        callerText.setTextSize(16f);
        callerText.setTypeface(null, Typeface.BOLD);
        callerText.setTextColor(Color.BLACK);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        callerText.setLayoutParams(nameParams);
        topRow.addView(callerText);

        // Urgency Level Badge
        TextView levelBadge = new TextView(this);
        String level = (record.getUrgencyLevel() != null) ? record.getUrgencyLevel() : "LOW";
        levelBadge.setText("[" + level + "]");
        levelBadge.setTextSize(14f);
        levelBadge.setTypeface(null, Typeface.BOLD);

        if ("HIGH".equalsIgnoreCase(level)) {
            levelBadge.setTextColor(Color.rgb(204, 0, 0)); // Red
        } else if ("MEDIUM".equalsIgnoreCase(level)) {
            levelBadge.setTextColor(Color.rgb(230, 120, 0)); // Amber/Orange
        } else {
            levelBadge.setTextColor(Color.rgb(0, 150, 0)); // Green
        }
        topRow.addView(levelBadge);
        card.addView(topRow);

        // Date and Urgency Score Row
        String dateStr = (record.getTimestamp() > 0)
                ? dateFormat.format(new Date(record.getTimestamp()))
                : "Timestamp unavailable";

        TextView metaText = new TextView(this);
        metaText.setText("Time: " + dateStr + "   |   Score: " + record.getUrgencyScore() + "/100");
        metaText.setTextSize(13f);
        metaText.setTextColor(Color.DKGRAY);
        metaText.setPadding(0, 6, 0, 8);
        card.addView(metaText);

        // Explanation Row
        String explanation = (record.getExplanation() != null && !record.getExplanation().isEmpty())
                ? record.getExplanation()
                : "No explanation details provided.";

        TextView expText = new TextView(this);
        expText.setText("Rule Analysis: " + explanation);
        expText.setTextSize(13f);
        expText.setTextColor(Color.rgb(70, 70, 70));
        card.addView(expText);

        return card;
    }

    private void confirmClearHistory() {
        new AlertDialog.Builder(this)
                .setTitle("Clear History")
                .setMessage("Are you sure you want to clear all call evaluation records?")
                .setPositiveButton("Clear", (dialog, which) -> {
                    repository.clearCallHistory();
                    Toast.makeText(CallHistoryActivity.this, "Call history cleared", Toast.LENGTH_SHORT).show();
                    refreshHistoryList();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }
}
