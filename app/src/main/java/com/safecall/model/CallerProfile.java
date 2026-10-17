package com.safecall.model;

public class CallerProfile {
    public enum Priority {
        NORMAL, TRUSTED, EMERGENCY
    }

    private long id;
    private String name;
    private String phoneNumber;
    private String relationship;
    private Priority priority;

    public CallerProfile(long id, String name, String phoneNumber, String relationship, Priority priority) {
        this.id = id;
        this.name = name;
        this.phoneNumber = phoneNumber;
        this.relationship = relationship;
        this.priority = priority;
    }

    public long getId() { return id; }
    public String getName() { return name; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getRelationship() { return relationship; }
    public Priority getPriority() { return priority; }
}
