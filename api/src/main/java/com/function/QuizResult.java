package com.function;

import java.time.LocalDateTime;

public class QuizResult {
    private String studentName;
    private int score;
    private String timestamp;

    public QuizResult() {
        this.timestamp = LocalDateTime.now().toString();
    }

    public QuizResult(String studentName, int score) {
        this();
        this.studentName = studentName;
        this.score = score;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
