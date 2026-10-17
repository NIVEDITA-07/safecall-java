package com.safecall;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.safecall.db.CallRepository;
import com.safecall.model.CallerProfile;

import java.util.List;

public class ContactManagementActivity extends Activity {

    private CallRepository repository;
    private LinearLayout contactListContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = new CallRepository(this);

        // Root ScrollView
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);

        // Main Layout
        LinearLayout mainLayout = new LinearLayout(this);
        mainLayout.setOrientation(LinearLayout.VERTICAL);
        mainLayout.setPadding(32, 32, 32, 32);

        // Header Title
        TextView titleView = new TextView(this);
        titleView.setText("Manage Contacts");
        titleView.setTextSize(24f);
        titleView.setTypeface(null, Typeface.BOLD);
        titleView.setTextColor(Color.DKGRAY);
        titleView.setPadding(0, 0, 0, 8);
        mainLayout.addView(titleView);

        // Subtitle / Description
        TextView descView = new TextView(this);
        descView.setText("Saved contacts and their assigned urgency priorities (Normal, Trusted, Emergency).");
        descView.setTextSize(14f);
        descView.setTextColor(Color.GRAY);
        descView.setPadding(0, 0, 0, 24);
        mainLayout.addView(descView);

        // Action Buttons Row (Add Contact & Back)
        LinearLayout actionsRow = new LinearLayout(this);
        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
        actionsRow.setPadding(0, 0, 0, 24);

        Button addContactBtn = new Button(this);
        addContactBtn.setText("+ Add New Contact");
        addContactBtn.setTextSize(15f);
        addContactBtn.setPadding(24, 20, 24, 20);
        LinearLayout.LayoutParams addParams = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        addParams.setMargins(0, 0, 12, 0);
        addContactBtn.setLayoutParams(addParams);
        addContactBtn.setOnClickListener(v -> showContactFormDialog(null));
        actionsRow.addView(addContactBtn);

        Button backBtn = new Button(this);
        backBtn.setText("Back");
        backBtn.setTextSize(15f);
        backBtn.setPadding(24, 20, 24, 20);
        LinearLayout.LayoutParams backParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        backBtn.setLayoutParams(backParams);
        backBtn.setOnClickListener(v -> finish());
        actionsRow.addView(backBtn);

        mainLayout.addView(actionsRow);

        // Contacts Section Label
        TextView listHeader = new TextView(this);
        listHeader.setText("Saved Contacts");
        listHeader.setTextSize(18f);
        listHeader.setTypeface(null, Typeface.BOLD);
        listHeader.setPadding(0, 0, 0, 16);
        mainLayout.addView(listHeader);

        // Dynamic Contacts Container
        contactListContainer = new LinearLayout(this);
        contactListContainer.setOrientation(LinearLayout.VERTICAL);
        mainLayout.addView(contactListContainer);

        scrollView.addView(mainLayout);
        setContentView(scrollView);
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshContactList();
    }

    private void refreshContactList() {
        contactListContainer.removeAllViews();
        List<CallerProfile> contacts = repository.getAllContacts();

        if (contacts == null || contacts.isEmpty()) {
            TextView emptyView = new TextView(this);
            emptyView.setText("No saved contacts found.\nTap '+ Add New Contact' to register emergency or trusted contacts.");
            emptyView.setTextSize(15f);
            emptyView.setTextColor(Color.GRAY);
            emptyView.setGravity(Gravity.CENTER);
            emptyView.setPadding(24, 48, 24, 48);
            contactListContainer.addView(emptyView);
            return;
        }

        for (final CallerProfile contact : contacts) {
            contactListContainer.addView(createContactCard(contact));
        }
    }

    private View createContactCard(final CallerProfile contact) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(24, 24, 24, 24);
        card.setBackgroundColor(Color.rgb(245, 247, 250));

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardParams.setMargins(0, 0, 0, 20);
        card.setLayoutParams(cardParams);

        // Top Row: Name and Priority Badge
        LinearLayout topRow = new LinearLayout(this);
        topRow.setOrientation(LinearLayout.HORIZONTAL);

        TextView nameText = new TextView(this);
        nameText.setText(contact.getName());
        nameText.setTextSize(17f);
        nameText.setTypeface(null, Typeface.BOLD);
        nameText.setTextColor(Color.BLACK);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        nameText.setLayoutParams(nameParams);
        topRow.addView(nameText);

        TextView priorityBadge = new TextView(this);
        String prio = (contact.getPriority() != null) ? contact.getPriority().name() : "NORMAL";
        priorityBadge.setText("[" + prio + "]");
        priorityBadge.setTextSize(13f);
        priorityBadge.setTypeface(null, Typeface.BOLD);

        if ("EMERGENCY".equalsIgnoreCase(prio)) {
            priorityBadge.setTextColor(Color.rgb(200, 20, 20)); // Red
        } else if ("TRUSTED".equalsIgnoreCase(prio)) {
            priorityBadge.setTextColor(Color.rgb(0, 102, 204)); // Blue
        } else {
            priorityBadge.setTextColor(Color.rgb(100, 100, 100)); // Grey
        }
        topRow.addView(priorityBadge);
        card.addView(topRow);

        // Subtitle: Phone & Relationship
        TextView detailsText = new TextView(this);
        String rel = (contact.getRelationship() != null && !contact.getRelationship().isEmpty())
                ? contact.getRelationship() : "General";
        detailsText.setText("Phone: " + contact.getPhoneNumber() + "  |  Relationship: " + rel);
        detailsText.setTextSize(14f);
        detailsText.setTextColor(Color.rgb(80, 80, 80));
        detailsText.setPadding(0, 8, 0, 16);
        card.addView(detailsText);

        // Action Buttons Row
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.END);

        Button editBtn = new Button(this);
        editBtn.setText("Edit");
        editBtn.setTextSize(13f);
        editBtn.setPadding(16, 12, 16, 12);
        editBtn.setOnClickListener(v -> showContactFormDialog(contact));
        btnRow.addView(editBtn);

        Button deleteBtn = new Button(this);
        deleteBtn.setText("Delete");
        deleteBtn.setTextSize(13f);
        deleteBtn.setTextColor(Color.RED);
        deleteBtn.setPadding(16, 12, 16, 12);
        deleteBtn.setOnClickListener(v -> confirmDeleteContact(contact));
        btnRow.addView(deleteBtn);

        card.addView(btnRow);
        return card;
    }

    private void showContactFormDialog(final CallerProfile existingContact) {
        final boolean isEdit = (existingContact != null);

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(isEdit ? "Edit Contact" : "Add New Contact");

        LinearLayout formLayout = new LinearLayout(this);
        formLayout.setOrientation(LinearLayout.VERTICAL);
        formLayout.setPadding(40, 24, 40, 24);

        // Name input
        TextView nameLabel = new TextView(this);
        nameLabel.setText("Contact Name *");
        nameLabel.setTextSize(13f);
        formLayout.addView(nameLabel);

        final EditText nameInput = new EditText(this);
        nameInput.setHint("e.g. Mom, Dr. Sharma");
        nameInput.setSingleLine(true);
        if (isEdit) nameInput.setText(existingContact.getName());
        formLayout.addView(nameInput);

        // Phone input
        TextView phoneLabel = new TextView(this);
        phoneLabel.setText("Phone Number *");
        phoneLabel.setTextSize(13f);
        phoneLabel.setPadding(0, 16, 0, 0);
        formLayout.addView(phoneLabel);

        final EditText phoneInput = new EditText(this);
        phoneInput.setHint("e.g. 9876543210");
        phoneInput.setInputType(InputType.TYPE_CLASS_PHONE);
        phoneInput.setSingleLine(true);
        if (isEdit) phoneInput.setText(existingContact.getPhoneNumber());
        formLayout.addView(phoneInput);

        // Relationship input
        TextView relLabel = new TextView(this);
        relLabel.setText("Relationship");
        relLabel.setTextSize(13f);
        relLabel.setPadding(0, 16, 0, 0);
        formLayout.addView(relLabel);

        final EditText relInput = new EditText(this);
        relInput.setHint("e.g. Family, Friend, Doctor, Work");
        relInput.setSingleLine(true);
        if (isEdit && existingContact.getRelationship() != null) {
            relInput.setText(existingContact.getRelationship());
        }
        formLayout.addView(relInput);

        // Priority Spinner
        TextView prioLabel = new TextView(this);
        prioLabel.setText("Urgency Priority *");
        prioLabel.setTextSize(13f);
        prioLabel.setPadding(0, 16, 0, 0);
        formLayout.addView(prioLabel);

        final Spinner prioritySpinner = new Spinner(this);
        String[] priorities = new String[]{"NORMAL", "TRUSTED", "EMERGENCY"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_dropdown_item, priorities);
        prioritySpinner.setAdapter(adapter);

        if (isEdit && existingContact.getPriority() != null) {
            String pName = existingContact.getPriority().name();
            for (int i = 0; i < priorities.length; i++) {
                if (priorities[i].equalsIgnoreCase(pName)) {
                    prioritySpinner.setSelection(i);
                    break;
                }
            }
        }
        formLayout.addView(prioritySpinner);

        ScrollView dialogScroll = new ScrollView(this);
        dialogScroll.addView(formLayout);
        builder.setView(dialogScroll);

        builder.setPositiveButton("Save", null); // Set listener later to control dismissal on validation error
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss());

        final AlertDialog dialog = builder.create();
        dialog.show();

        // Custom positive button listener for validation without auto-dismiss
        dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener(v -> {
            String name = nameInput.getText().toString().trim();
            String phone = phoneInput.getText().toString().trim();
            String relationship = relInput.getText().toString().trim();
            String prioStr = (String) prioritySpinner.getSelectedItem();

            if (name.isEmpty()) {
                nameInput.setError("Name is required");
                return;
            }
            if (phone.isEmpty()) {
                phoneInput.setError("Phone number is required");
                return;
            }
            // Basic phone format validation
            if (phone.length() < 3) {
                phoneInput.setError("Please enter a valid phone number");
                return;
            }

            CallerProfile.Priority priority;
            try {
                priority = CallerProfile.Priority.valueOf(prioStr);
            } catch (Exception e) {
                priority = CallerProfile.Priority.NORMAL;
            }

            // Check duplicate phone number if new or changed phone
            if (!isEdit || !phone.equals(existingContact.getPhoneNumber())) {
                CallerProfile existing = repository.getContactByPhone(phone);
                if (existing != null) {
                    phoneInput.setError("A contact with this phone number already exists");
                    return;
                }
            }

            // If editing and phone number changed, remove old phone record
            if (isEdit && !phone.equals(existingContact.getPhoneNumber())) {
                repository.deleteContact(existingContact.getPhoneNumber());
            }

            long id = isEdit ? existingContact.getId() : 0;
            CallerProfile newProfile = new CallerProfile(id, name, phone, relationship, priority);
            repository.addOrUpdateContact(newProfile);

            Toast.makeText(ContactManagementActivity.this,
                    isEdit ? "Contact updated successfully" : "Contact added successfully",
                    Toast.LENGTH_SHORT).show();

            dialog.dismiss();
            refreshContactList();
        });
    }

    private void confirmDeleteContact(final CallerProfile contact) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Contact")
                .setMessage("Are you sure you want to delete " + contact.getName() + " (" + contact.getPhoneNumber() + ")?")
                .setPositiveButton("Delete", (dialog, which) -> {
                    repository.deleteContact(contact.getPhoneNumber());
                    Toast.makeText(ContactManagementActivity.this, "Contact deleted", Toast.LENGTH_SHORT).show();
                    refreshContactList();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }
}
