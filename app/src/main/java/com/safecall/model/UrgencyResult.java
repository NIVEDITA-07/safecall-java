package com.safecall.model;

public class UrgencyResult {
    public enum Level {
        LOW, MEDIUM, HIGH
    }

    private int score;
    private Level urgencyLevel;
    private String explanation;

    public UrgencyResult(int score, Level urgencyLevel, String explanation) {
        this.score = Math.max(0, Math.min(100, score)); // Clamp 0-100
        this.urgencyLevel = urgencyLevel;
        this.explanation = explanation;
    }

    public int getScore() { return score; }
    public Level getUrgencyLevel() { return urgencyLevel; }
    public String getExplanation() { return explanation; }
}
